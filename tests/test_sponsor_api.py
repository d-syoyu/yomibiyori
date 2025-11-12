"""Tests for sponsor profile and campaign APIs."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import jwt

from app.core.config import get_settings
from app.models import Sponsor, User


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
        plan_tier="basic",
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
            "plan_tier": "basic",
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
            "plan_tier": "premium",
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
