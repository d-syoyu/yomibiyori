"""Tests for sponsor profile and campaign APIs."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.core.config import get_settings
from app.models import Sponsor, Theme, User


def _create_user(db_session, *, role: str = "sponsor", email_prefix: str = "sponsor") -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Sponsor User",
        email=f"{email_prefix}-{uuid4()}@example.com",
        role=role,
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _auth_headers(user_id: str) -> dict[str, str]:
    settings = get_settings()
    token = jwt.encode({"sub": user_id}, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _create_sponsor_profile(db_session, user: User, *, verified: bool = False) -> Sponsor:
    now = datetime.now(timezone.utc)
    sponsor = Sponsor(
        id=user.id,
        company_name=f"テスト企業-{uuid4()}",
        contact_email=user.email,
        official_url="https://example.com",
        logo_url=None,
        credits=0,
        verified=verified,
        created_at=now,
        updated_at=now,
    )
    db_session.add(sponsor)
    db_session.commit()
    db_session.refresh(sponsor)
    return sponsor


def _campaign_payload() -> dict[str, object]:
    return {
        "name": "春告げキャンペーン",
        "budget": "100000.00",
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
        "targeting": {
            "region": [],
            "age_band": [],
            "os": [],
        },
    }


def test_campaign_creation_requires_profile(client, db_session):
    user = _create_user(db_session)

    response = client.post(
        "/api/v1/sponsor/campaigns",
        json=_campaign_payload(),
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 400
    assert "Sponsor profile not found" in response.json()["error"]["detail"]


def test_campaign_creation_requires_verification(client, db_session):
    user = _create_user(db_session)

    profile_response = client.post(
        "/api/v1/sponsor/profile",
        json={
            "company_name": "花霞株式会社",
            "contact_email": "hello@example.com",
            "official_url": "https://example.com",
            "logo_url": None,
        },
        headers=_auth_headers(user.id),
    )
    assert profile_response.status_code == 201

    response = client.post(
        "/api/v1/sponsor/campaigns",
        json=_campaign_payload(),
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 403
    assert response.json()["error"]["detail"] == "Sponsor profile is pending verification"


def test_campaign_creation_succeeds_when_verified(client, db_session):
    user = _create_user(db_session)

    client.post(
        "/api/v1/sponsor/profile",
        json={
            "company_name": "月灯り工房",
            "contact_email": "sponsor@example.com",
        },
        headers=_auth_headers(user.id),
    )

    sponsor = db_session.get(Sponsor, user.id)
    sponsor.verified = True
    sponsor.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    response = client.post(
        "/api/v1/sponsor/campaigns",
        json=_campaign_payload(),
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "春告げキャンペーン"
    assert data["sponsor_id"] == user.id


def test_admin_can_list_sponsors(client, db_session):
    sponsor_user = _create_user(db_session)
    _create_sponsor_profile(db_session, sponsor_user, verified=False)
    admin_user = _create_user(db_session, role="admin", email_prefix="admin")

    response = client.get(
        "/api/v1/admin/sponsors",
        headers=_auth_headers(admin_user.id),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["sponsors"][0]["id"] == sponsor_user.id


def test_admin_can_toggle_sponsor_verification(client, db_session):
    sponsor_user = _create_user(db_session)
    sponsor_profile = _create_sponsor_profile(db_session, sponsor_user, verified=False)
    admin_user = _create_user(db_session, role="admin", email_prefix="admin")

    verify_response = client.patch(
        f"/api/v1/admin/sponsors/{sponsor_profile.id}/verification",
        json={"verified": True},
        headers=_auth_headers(admin_user.id),
    )

    assert verify_response.status_code == 200
    assert verify_response.json()["verified"] is True
    db_session.refresh(sponsor_profile)
    assert sponsor_profile.verified is True

    unverify_response = client.patch(
        f"/api/v1/admin/sponsors/{sponsor_profile.id}/verification",
        json={"verified": False},
        headers=_auth_headers(admin_user.id),
    )

    assert unverify_response.status_code == 200
    assert unverify_response.json()["verified"] is False
    db_session.refresh(sponsor_profile)
    assert sponsor_profile.verified is False


def test_theme_calendar_shows_approved_themes(client, db_session):
    """Test that the calendar endpoint shows approved themes correctly."""
    user = _create_user(db_session)
    _create_sponsor_profile(db_session, user, verified=True)

    # Create some test themes
    today = date.today()
    tomorrow = today + timedelta(days=1)
    day_after = today + timedelta(days=2)

    now = datetime.now(timezone.utc)

    # Theme 1: AI-generated theme for today, 恋愛 category
    theme1 = Theme(
        id=str(uuid4()),
        text="春の風吹く 恋の予感に 胸高鳴る",
        category="恋愛",
        date=today,
        sponsored=False,
        created_at=now,
    )
    db_session.add(theme1)

    # Theme 2: Sponsored theme for tomorrow, 季節 category
    theme2 = Theme(
        id=str(uuid4()),
        text="桜舞い散る 花の雨降る 春の宵",
        category="季節",
        date=tomorrow,
        sponsored=True,
        sponsor_company_name="テスト企業",
        created_at=now,
    )
    db_session.add(theme2)

    # Theme 3: AI-generated theme for day after tomorrow, 日常 category
    theme3 = Theme(
        id=str(uuid4()),
        text="朝の光に 目覚める喜び 新しい日",
        category="日常",
        date=day_after,
        sponsored=False,
        created_at=now,
    )
    db_session.add(theme3)

    db_session.commit()

    # Test the calendar endpoint
    response = client.get(
        f"/api/v1/sponsor/themes/calendar?start_date={today}&end_date={day_after}",
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "days" in data
    assert "start_date" in data
    assert "end_date" in data
    assert data["start_date"] == str(today)
    assert data["end_date"] == str(day_after)

    # Verify we have entries for all categories and dates
    days = data["days"]
    categories = ["恋愛", "季節", "日常", "ユーモア"]
    num_days = (day_after - today).days + 1
    expected_entries = len(categories) * num_days

    assert len(days) == expected_entries

    # Find and verify specific entries
    def find_entry(target_date, category):
        return next(
            (d for d in days if d["date"] == str(target_date) and d["category"] == category),
            None,
        )

    # Check today's 恋愛 (has AI theme)
    entry1 = find_entry(today, "恋愛")
    assert entry1 is not None
    assert entry1["has_approved_theme"] is True
    assert entry1["is_sponsored"] is False

    # Check tomorrow's 季節 (has sponsored theme)
    entry2 = find_entry(tomorrow, "季節")
    assert entry2 is not None
    assert entry2["has_approved_theme"] is True
    assert entry2["is_sponsored"] is True

    # Check day after tomorrow's 日常 (has AI theme)
    entry3 = find_entry(day_after, "日常")
    assert entry3 is not None
    assert entry3["has_approved_theme"] is True
    assert entry3["is_sponsored"] is False

    # Check a slot with no theme (e.g., today's ユーモア)
    entry_empty = find_entry(today, "ユーモア")
    assert entry_empty is not None
    assert entry_empty["has_approved_theme"] is False
    assert entry_empty["is_sponsored"] is False


def test_theme_calendar_requires_authentication(client, db_session):
    """Test that the calendar endpoint requires authentication."""
    response = client.get("/api/v1/sponsor/themes/calendar")

    assert response.status_code == 401


def test_theme_calendar_default_range(client, db_session):
    """Test that the calendar endpoint uses default 30-day range."""
    user = _create_user(db_session)
    _create_sponsor_profile(db_session, user, verified=True)

    response = client.get(
        "/api/v1/sponsor/themes/calendar",
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 200
    data = response.json()

    # Verify default range is 30 days
    start = date.fromisoformat(data["start_date"])
    end = date.fromisoformat(data["end_date"])
    assert (end - start).days == 30

    # Verify we have entries for all 4 categories for 31 days (inclusive)
    assert len(data["days"]) == 4 * 31
