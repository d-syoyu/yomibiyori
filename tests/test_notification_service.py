"""Unit tests for notification dispatch services."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models import Like, NotificationToken, Ranking, Theme, User, Work
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


def test_ranking_notification_personalized_with_likes(db_session: Session) -> None:
    """投稿者にいいねがあった場合、いいね数を含む通知が送られる."""
    target_date = datetime(2025, 1, 3).date()
    author = _create_user(db_session)
    liker = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=target_date)
    theme_uuid = UUID(theme.id)

    # 作品を作成
    work = Work(
        id=str(uuid4()),
        user_id=author.id,
        theme_id=theme.id,
        text="テスト短歌",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(work)
    db_session.commit()

    # いいねを追加
    like = Like(
        id=str(uuid4()),
        user_id=liker.id,
        work_id=work.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(like)

    # ランキングを追加
    ranking = Ranking(
        theme_id=theme_uuid,
        work_id=UUID(work.id),
        score=0.9,
        rank=1,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking)

    # トークンを追加
    token = NotificationToken(
        id=str(uuid4()),
        user_id=author.id,
        expo_push_token="ExponentPushToken[author]",
        is_active=True,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    client = _FakePushClient()
    result = send_ranking_result_notifications(db_session, target_date=target_date, push_client=client)

    assert result.sent == 1
    assert len(client.messages) == 1
    payload = client.messages[0].payload
    assert payload["body"] == "あなたの作品に1件のいいねが集まりました！"


def test_ranking_notification_personalized_no_likes(db_session: Session) -> None:
    """投稿者にいいねがなかった場合、ねぎらいの通知が送られる."""
    target_date = datetime(2025, 1, 4).date()
    author = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=target_date)
    theme_uuid = UUID(theme.id)

    # 作品を作成（いいねなし）
    work = Work(
        id=str(uuid4()),
        user_id=author.id,
        theme_id=theme.id,
        text="テスト短歌",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(work)
    db_session.commit()

    # ランキングを追加
    ranking = Ranking(
        theme_id=theme_uuid,
        work_id=UUID(work.id),
        score=0.5,
        rank=10,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking)

    # トークンを追加
    token = NotificationToken(
        id=str(uuid4()),
        user_id=author.id,
        expo_push_token="ExponentPushToken[author2]",
        is_active=True,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    client = _FakePushClient()
    result = send_ranking_result_notifications(db_session, target_date=target_date, push_client=client)

    assert result.sent == 1
    assert len(client.messages) == 1
    payload = client.messages[0].payload
    assert payload["body"] == "今日も投稿おつかれさまでした！"


def test_ranking_notification_default_for_non_poster(db_session: Session) -> None:
    """投稿していないユーザーには標準の通知が送られる."""
    target_date = datetime(2025, 1, 5).date()
    author = _create_user(db_session)
    viewer = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=target_date)
    theme_uuid = UUID(theme.id)

    # 別のユーザーが投稿
    work = Work(
        id=str(uuid4()),
        user_id=author.id,
        theme_id=theme.id,
        text="テスト短歌",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(work)
    db_session.commit()

    # ランキングを追加
    ranking = Ranking(
        theme_id=theme_uuid,
        work_id=UUID(work.id),
        score=0.5,
        rank=1,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking)

    # 閲覧者のトークンのみ追加（投稿していない）
    token = NotificationToken(
        id=str(uuid4()),
        user_id=viewer.id,
        expo_push_token="ExponentPushToken[viewer]",
        is_active=True,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    client = _FakePushClient()
    result = send_ranking_result_notifications(db_session, target_date=target_date, push_client=client)

    assert result.sent == 1
    assert len(client.messages) == 1
    payload = client.messages[0].payload
    assert payload["body"] == "20位までの結果をアプリでチェックしましょう。"
