"""Tests for high-level notification helpers."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import PushSubscription, Theme, User
from app.services import notifications


def _create_user(session: Session) -> User:
    user = User(
        id=str(uuid4()),
        name="Notifier",
        email=f"notifier-{uuid4()}@example.com",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, *, date_value: datetime, category: str = "general") -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="Morning light dances on the harbour",
        category=category,
        date=date_value.date(),
        sponsored=False,
        created_at=date_value,
    )
    session.add(theme)
    session.commit()
    return theme


def _subscribe(session: Session, user: User, token: str) -> None:
    session.add(
        PushSubscription(
            user_id=user.id,
            expo_token=token,
        )
    )
    session.commit()


def test_send_theme_release_notifications_sends_messages(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user(db_session)
    settings = get_settings()
    base_datetime = datetime(2025, 1, 20, 6, tzinfo=settings.timezone)
    _create_theme(db_session, date_value=base_datetime)
    _create_theme(db_session, date_value=base_datetime, category="love")
    _subscribe(db_session, user, "ExponentPushToken[token-1]")
    _subscribe(db_session, user, "ExponentPushToken[token-2]")

    captured = {}

    def fake_send(messages):
        captured["messages"] = messages

    monkeypatch.setattr(notifications.push, "send_push_notifications", fake_send)

    count = notifications.send_theme_release_notifications(db_session, target_date=base_datetime)

    assert count == 4  # 2 themes * 2 tokens
    sent_messages = captured["messages"]
    assert len(sent_messages) == 4
    assert all(msg.title.endswith("のお題") for msg in sent_messages)
    assert all(msg.data and "theme_id" in msg.data for msg in sent_messages)


def test_send_submission_reminder_notifications_without_tokens(db_session: Session) -> None:
    sent = notifications.send_submission_reminder_notifications(db_session)
    assert sent == 0


def test_send_ranking_finalized_notifications(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user(db_session)
    _subscribe(db_session, user, "ExponentPushToken[token-3]")

    captured = {}

    def fake_send(messages):
        captured["messages"] = messages

    monkeypatch.setattr(notifications.push, "send_push_notifications", fake_send)

    sent = notifications.send_ranking_finalized_notifications(db_session, target_date=datetime(2025, 1, 20, tzinfo=get_settings().timezone))
    assert sent == 1
    message = captured["messages"][0]
    assert message.data == {"type": "ranking_finalized"}
