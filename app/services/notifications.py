"""Notification token registration and push dispatch helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Iterable, Sequence
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.notification import NotificationToken
from app.models.theme import Theme
from app.models.ranking import Ranking
from app.models.user import User
from app.schemas.notification import NotificationTokenCreate, NotificationTokenResponse


class NotificationError(RuntimeError):
    """Raised when notifications cannot be dispatched."""


@dataclass
class NotificationTemplate:
    """Push notification payload template."""

    title: str
    body: str
    data: dict[str, Any]


@dataclass
class NotificationMessage:
    """Prepared Expo push message."""

    token: NotificationToken
    payload: dict[str, Any]


@dataclass
class NotificationDispatchResult:
    """Summary of a notification send attempt."""

    kind: str
    target_date: date
    total_tokens: int
    sent: int
    failed: int
    disabled: int
    detail: str | None = None


def register_notification_token(
    session: Session,
    *,
    user_id: str,
    payload: NotificationTokenCreate,
) -> NotificationTokenResponse:
    """Create or update an Expo push token for the authenticated user."""

    token_value = payload.expo_push_token.strip()
    stmt = select(NotificationToken).where(NotificationToken.expo_push_token == token_value)
    token = session.execute(stmt).scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if token:
        token.user_id = user_id
        if payload.device_id:
            token.device_id = payload.device_id
        if payload.platform:
            token.platform = payload.platform
        if payload.app_version:
            token.app_version = payload.app_version
        token.is_active = True
        token.last_registered_at = now
    else:
        token = NotificationToken(
            user_id=user_id,
            expo_push_token=token_value,
            device_id=payload.device_id,
            platform=payload.platform,
            app_version=payload.app_version,
            is_active=True,
            last_registered_at=now,
        )
        session.add(token)

    session.commit()
    session.refresh(token)
    return NotificationTokenResponse.model_validate(token)


def send_theme_release_notifications(
    session: Session,
    *,
    target_date: date | None = None,
    push_client: "ExpoPushClient | None" = None,
) -> NotificationDispatchResult:
    """Send morning notifications announcing the daily themes."""

    settings = get_settings()
    resolved_date = target_date or datetime.now(settings.timezone).date()
    themes = session.scalars(
        select(Theme).where(Theme.date == resolved_date).order_by(Theme.category.asc())
    ).all()
    if not themes:
        return NotificationDispatchResult(
            kind="theme_release",
            target_date=resolved_date,
            total_tokens=0,
            sent=0,
            failed=0,
            disabled=0,
            detail="No themes available for target date",
        )

    tokens = _fetch_tokens_for_kind(session, User.notify_theme_release.is_(True))
    template = _build_theme_template(resolved_date, themes)
    return _dispatch_notifications(
        session,
        tokens=tokens,
        template=template,
        kind="theme_release",
        target_date=resolved_date,
        push_client=push_client,
    )


def send_ranking_result_notifications(
    session: Session,
    *,
    target_date: date | None = None,
    push_client: "ExpoPushClient | None" = None,
) -> NotificationDispatchResult:
    """Send evening notifications after rankings are finalised."""

    settings = get_settings()
    resolved_date = target_date or datetime.now(settings.timezone).date()

    theme_ids_raw = session.scalars(
        select(Theme.id).where(Theme.date == resolved_date)
    ).all()
    if not theme_ids_raw:
        return NotificationDispatchResult(
            kind="ranking_finalized",
            target_date=resolved_date,
            total_tokens=0,
            sent=0,
            failed=0,
            disabled=0,
            detail="No themes found for rankings",
        )

    theme_uuid_ids = [_coerce_uuid(value) for value in theme_ids_raw if value]
    has_rankings = session.scalar(
        select(func.count()).where(Ranking.theme_id.in_(theme_uuid_ids))
    )
    if not has_rankings:
        return NotificationDispatchResult(
            kind="ranking_finalized",
            target_date=resolved_date,
            total_tokens=0,
            sent=0,
            failed=0,
            disabled=0,
            detail="No ranking data stored for target date",
        )

    tokens = _fetch_tokens_for_kind(session, User.notify_ranking_result.is_(True))
    template = NotificationTemplate(
        title="今日のランキングが確定しました",
        body="20位までの結果をアプリでチェックしましょう。",
        data={
            "type": "ranking_finalized",
            "date": resolved_date.isoformat(),
        },
    )
    return _dispatch_notifications(
        session,
        tokens=tokens,
        template=template,
        kind="ranking_finalized",
        target_date=resolved_date,
        push_client=push_client,
    )


def _build_theme_template(target_date: date, themes: Sequence[Theme]) -> NotificationTemplate:
    """Construct summary text for the theme release notification."""

    formatted_date = target_date.strftime("%m/%d")
    primary_theme = themes[0].text
    if len(themes) == 1:
        body = f"本日（{formatted_date}）のお題「{primary_theme}」を詠んでみましょう。"
    else:
        body = f"本日（{formatted_date}）は「{primary_theme}」など{len(themes)}件のお題が解禁されました。"

    return NotificationTemplate(
        title="本日のお題が届きました",
        body=body,
        data={
            "type": "theme_release",
            "date": target_date.isoformat(),
            "themes": [theme.id for theme in themes],
        },
    )


def _fetch_tokens_for_kind(session: Session, predicate) -> list[NotificationToken]:
    """Return active notification tokens filtered by the user predicate."""

    stmt = (
        select(NotificationToken)
        .join(NotificationToken.user)
        .where(NotificationToken.is_active.is_(True))
        .where(predicate)
    )
    return session.scalars(stmt).all()


def _dispatch_notifications(
    session: Session,
    *,
    tokens: Sequence[NotificationToken],
    template: NotificationTemplate,
    kind: str,
    target_date: date,
    push_client: "ExpoPushClient | None" = None,
) -> NotificationDispatchResult:
    """Send the prepared notification template to each token."""

    if not tokens:
        return NotificationDispatchResult(
            kind=kind,
            target_date=target_date,
            total_tokens=0,
            sent=0,
            failed=0,
            disabled=0,
            detail="No active tokens",
        )

    client = push_client or ExpoPushClient()
    messages: list[NotificationMessage] = []
    now = datetime.now(timezone.utc)
    for token in tokens:
        token.last_sent_at = now
        payload_data = _sanitize_payload(template.data | {"user_id": token.user_id})
        messages.append(
            NotificationMessage(
                token=token,
                payload={
                    "to": token.expo_push_token,
                    "sound": "default",
                    "title": template.title,
                    "body": template.body,
                    "data": payload_data,
                },
            )
        )

    dispatch_records = client.send(messages)

    failed = 0
    disabled = 0
    for message, ticket in dispatch_records:
        status = ticket.get("status")
        if status == "ok":
            continue
        failed += 1
        details = ticket.get("details") or {}
        error_code = details.get("error")
        if error_code in {"DeviceNotRegistered", "MessageTooBig", "MessageRateExceeded"}:
            message.token.is_active = False
            disabled += 1

    session.commit()
    total = len(messages)
    sent = total - failed

    for message, ticket in dispatch_records:
        if ticket.get("status") != "ok":
            print(
                "[Notifications] Expo ticket error",
                {
                    "token": message.token.expo_push_token,
                    "ticket": ticket,
                    "kind": kind,
                    "date": target_date,
                },
            )

    return NotificationDispatchResult(
        kind=kind,
        target_date=target_date,
        total_tokens=total,
        sent=sent,
        failed=failed,
        disabled=disabled,
    )


class ExpoPushClient:
    """Thin wrapper around Expo Push REST API."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_url = self.settings.expo_push_api_url
        self.timeout = self.settings.expo_push_timeout
        self.batch_size = max(1, min(self.settings.notification_batch_size, 100))

    def send(self, messages: Sequence[NotificationMessage]) -> list[tuple[NotificationMessage, dict[str, Any]]]:
        """Send Expo push messages and return ticket responses."""

        if not messages:
            return []

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
        }
        if self.settings.expo_access_token:
            headers["Authorization"] = f"Bearer {self.settings.expo_access_token}"

        results: list[tuple[NotificationMessage, dict[str, Any]]] = []
        for chunk in _chunked(messages, self.batch_size):
            payload = [message.payload for message in chunk]
            try:
                response = httpx.post(self.api_url, headers=headers, json=payload, timeout=self.timeout)
                response.raise_for_status()
                body = response.json()
            except httpx.HTTPError as exc:
                raise NotificationError(f"Failed to call Expo push API: {exc}") from exc

            tickets: Iterable[dict[str, Any]] = body.get("data", []) if isinstance(body, dict) else []
            ticket_list = list(tickets)
            if len(ticket_list) < len(chunk):
                ticket_list.extend([{"status": "error", "message": "Missing Expo push ticket"}] * (len(chunk) - len(ticket_list)))

            for message, ticket in zip(chunk, ticket_list, strict=False):
                results.append((message, ticket))

        return results


def _chunked(sequence: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    """Yield sequence values in fixed-size chunks."""

    for idx in range(0, len(sequence), size):
        yield sequence[idx : idx + size]


def _coerce_uuid(value: Any) -> UUID:
    """Convert DB values (uuid | str) into UUID objects."""

    if isinstance(value, UUID):
        return value
    return UUID(str(value))


def _sanitize_payload(value: Any) -> Any:
    """Recursively convert payload data into JSON-safe types."""

    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: _sanitize_payload(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_sanitize_payload(item) for item in value]
    return value
