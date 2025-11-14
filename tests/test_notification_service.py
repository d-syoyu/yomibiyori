"""Unit tests for notification dispatch services."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models import NotificationToken, Ranking, Theme, User, Work
from app.services.notifications import (
    NotificationDispatchResult,
    send_ranking_result_notifications,
    send_theme_release_notifications,
)


class _FakePushClient:
    def __init__(self, tickets: list[dict] | None = None) -> None:
        self.tickets = tickets or []
        self.messages = []

    def send(self, messages):
        self.messages.extend(messages)
        if not self.tickets:
            ticket_payloads = [{"status": "ok"} for _ in messages]
        else:
            ticket_payloads = self.tickets
        return list(zip(messages, ticket_payloads))


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Poet",
        email=f"{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, *, theme_date) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="桜の朝",
        category="general",
        date=theme_date,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    session.add(theme)
    session.commit()
    return theme


def test_send_theme_release_notifications_success(db_session: Session) -> None:
    target_date = datetime(2025, 1, 1).date()
    user = _create_user(db_session)
    _create_theme(db_session, theme_date=target_date)
    token = NotificationToken(
        id=str(uuid4()),
        user_id=user.id,
        expo_push_token="ExponentPushToken[test]",
        is_active=True,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    client = _FakePushClient()
    result = send_theme_release_notifications(db_session, target_date=target_date, push_client=client)

    assert isinstance(result, NotificationDispatchResult)
    assert result.sent == 1
    assert result.failed == 0
    assert len(client.messages) == 1
    db_session.refresh(token)
    assert token.is_active is True
    assert token.last_sent_at is not None


def test_send_ranking_notifications_disabled_token(db_session: Session) -> None:
    target_date = datetime(2025, 1, 2).date()
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=target_date)
    theme_uuid = UUID(theme.id)
    work_id = uuid4()
    work = Work(
        id=str(work_id),
        user_id=user.id,
        theme_id=theme.id,
        text="短歌の下の句",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(work)
    db_session.commit()
    ranking = Ranking(
        theme_id=theme_uuid,
        work_id=work_id,
        score=0.9,
        rank=1,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking)
    token = NotificationToken(
        id=str(uuid4()),
        user_id=user.id,
        expo_push_token="ExponentPushToken[device]",
        is_active=True,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    client = _FakePushClient(tickets=[{"status": "error", "details": {"error": "DeviceNotRegistered"}}])
    result = send_ranking_result_notifications(db_session, target_date=target_date, push_client=client)

    assert result.sent == 0
    assert result.failed == 1
    assert result.disabled == 1
    db_session.refresh(token)
    assert token.is_active is False
