"""Application-level notification helpers that orchestrate Expo push messages."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.models import PushSubscription, Theme
from app.services import push


def _collect_tokens(session: Session) -> list[str]:
    """Return every Expo push token currently registered."""

    subscriptions = session.execute(select(PushSubscription)).scalars().all()
    tokens = [subscription.expo_token for subscription in subscriptions]
    logger.debug("[notifications] Loaded %s push subscriptions.", len(tokens))
    return tokens


def send_theme_release_notifications(
    session: Session,
    *,
    target_date: datetime | None = None,
) -> int:
    """Send morning notifications announcing the day's themes."""

    settings = get_settings()
    tz = settings.timezone
    resolved = target_date.astimezone(tz).date() if target_date else datetime.now(tz).date()
    themes = session.execute(select(Theme).where(Theme.date == resolved)).scalars().all()
    if not themes:
        logger.info("[notifications] No themes found for %s; skipping theme release push.", resolved)
        return 0

    tokens = _collect_tokens(session)
    if not tokens:
        logger.info("[notifications] No push subscriptions found; skipping theme release push.")
        return 0

    messages: list[push.PushMessage] = []
    for theme in themes:
        title = f"{resolved:%m/%d} のお題"
        body = f"[{theme.category}] {theme.text}"
        data = {"theme_id": theme.id, "category": theme.category}
        for token in tokens:
            messages.append(push.PushMessage(to=token, title=title, body=body, data=data))

    push.send_push_notifications(messages)
    return len(messages)


def send_submission_reminder_notifications(session: Session) -> int:
    """Send the evening reminder about the upcoming submission deadline."""

    tokens = _collect_tokens(session)
    if not tokens:
        logger.info("[notifications] No push subscriptions found; skipping submission reminder push.")
        return 0

    title = "投稿締切のお知らせ"
    body = "本日の下の句投稿は22:00で締切です。お題ページから投稿できます。"
    message = push.PushMessage(
        to="",
        title=title,
        body=body,
        data={"type": "submission_reminder"},
    )

    push.send_push_notifications([replace(message, to=token) for token in tokens])
    return len(tokens)


def send_ranking_finalized_notifications(
    session: Session,
    *,
    target_date: datetime | None = None,
) -> int:
    """Notify users that rankings have been finalized and are ready to view."""

    settings = get_settings()
    tz = settings.timezone
    resolved = target_date.astimezone(tz).date() if target_date else datetime.now(tz).date()

    tokens = _collect_tokens(session)
    if not tokens:
        logger.info("[notifications] No push subscriptions found; skipping ranking finalised push.")
        return 0

    title = "ランキング確定のお知らせ"
    body = f"{resolved:%m/%d} のランキングが確定しました。お気に入りの作品をチェックしましょう。"
    base_message = push.PushMessage(
        to="",
        title=title,
        body=body,
        data={"type": "ranking_finalized"},
    )

    push.send_push_notifications([replace(base_message, to=token) for token in tokens])
    return len(tokens)
