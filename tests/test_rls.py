"""Tests for Row Level Security (RLS) policies."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import jwt
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import clear_request_user_context, set_request_user_context
from app.models import Theme, User, Work


@pytest.fixture
def user_a(db_session: Session) -> User:
    """Create first test user."""
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="User A",
        email=f"user-a-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def user_b(db_session: Session) -> User:
    """Create second test user."""
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="User B",
        email=f"user-b-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def theme(db_session: Session) -> Theme:
    """Create test theme."""
    now = datetime.now(timezone.utc)
    theme = Theme(
        id=str(uuid4()),
        text="春の風",
        date=now.date(),
        category="season",
        created_at=now,
    )
    db_session.add(theme)
    db_session.commit()
    db_session.refresh(theme)
    return theme


_policies_updated = False


@pytest.fixture(autouse=True)
def update_rls_policies(db_session: Session):
    """Update RLS policies to latest version (once per session)."""
    global _policies_updated

    settings = get_settings()

    # Skip if not PostgreSQL or already updated
    if not settings.database_url.startswith("postgresql") or _policies_updated:
        yield
        return

    # Drop old policies
    db_session.execute(text("DROP POLICY IF EXISTS update_own_work ON works"))
    db_session.execute(text("DROP POLICY IF EXISTS insert_own_work ON works"))
    db_session.execute(text("DROP POLICY IF EXISTS delete_own_work ON works"))
    db_session.execute(text("DROP POLICY IF EXISTS insert_own_like ON likes"))
    db_session.execute(text("DROP POLICY IF EXISTS delete_own_like ON likes"))

    # Create new policies
    db_session.execute(text("""
        CREATE POLICY insert_own_work ON works
        FOR INSERT
        WITH CHECK (user_id = app_public.current_uid() OR app_public.is_service_role())
    """))

    db_session.execute(text("""
        CREATE POLICY update_own_work ON works
        FOR UPDATE
        USING (user_id = app_public.current_uid() OR app_public.is_service_role())
        WITH CHECK (user_id = app_public.current_uid() OR app_public.is_service_role())
    """))

    db_session.execute(text("""
        CREATE POLICY delete_own_work ON works
        FOR DELETE
        USING (user_id = app_public.current_uid() OR app_public.is_service_role())
    """))

    db_session.execute(text("""
        CREATE POLICY insert_own_like ON likes
        FOR INSERT
        WITH CHECK (user_id = app_public.current_uid() OR app_public.is_service_role())
    """))

    db_session.execute(text("""
        CREATE POLICY delete_own_like ON likes
        FOR DELETE
        USING (user_id = app_public.current_uid() OR app_public.is_service_role())
    """))

    db_session.commit()
    _policies_updated = True
    yield


@pytest.fixture(autouse=True)
def cleanup_context():
    """Clean up request context after each test."""
    yield
    clear_request_user_context()


def test_rls_context_setting(db_session: Session, user_a: User):
    """Test that setting request context sets PostgreSQL GUC variables."""
    settings = get_settings()

    # Skip test if not using PostgreSQL
    if not settings.database_url.startswith("postgresql"):
        pytest.skip("RLS tests require PostgreSQL")

    # Set request context
    set_request_user_context(user_a.id, "authenticated")

    # Create new session to test GUC setting
    from app.db.session import get_db_session

    session_gen = get_db_session()
    test_session = next(session_gen)

    try:
        # Verify GUC variables are set using current_setting()
        result = test_session.execute(text("SELECT current_setting('app.current_uid', true)"))
        current_uid = result.scalar()
        assert current_uid == user_a.id, f"Expected {user_a.id}, got {current_uid}"

        result = test_session.execute(text("SELECT current_setting('app.current_role', true)"))
        current_role = result.scalar()
        assert current_role == "authenticated", f"Expected authenticated, got {current_role}"
    finally:
        test_session.close()


def test_rls_work_isolation(db_session: Session, user_a: User, user_b: User, theme: Theme):
    """Test that users can only update/delete their own works."""
    settings = get_settings()

    # Skip test if not using PostgreSQL
    if not settings.database_url.startswith("postgresql"):
        pytest.skip("RLS tests require PostgreSQL")

    now = datetime.now(timezone.utc)

    # User A creates a work
    work_a = Work(
        id=str(uuid4()),
        user_id=user_a.id,
        theme_id=theme.id,
        text="そよぐ道を花びらが舞う",
        created_at=now,
        updated_at=now,
    )
    db_session.add(work_a)
    db_session.commit()
    db_session.refresh(work_a)

    # Set context as User B
    set_request_user_context(user_b.id, "authenticated")

    # Create new session with User B's context
    from app.db.session import get_db_session

    session_gen = get_db_session()
    test_session = next(session_gen)

    try:
        # User B should not be able to update User A's work
        result = test_session.execute(
            text("UPDATE works SET text = :new_text WHERE id = :work_id RETURNING text"),
            {"new_text": "HACKED", "work_id": work_a.id}
        )
        # If RLS is working, UPDATE should affect 0 rows and RETURNING should be empty
        updated_text = result.scalar()
        assert updated_text is None, f"RLS failed: User B was able to update User A's work (got: {updated_text})"
        test_session.commit()

    finally:
        test_session.close()

    # Clean up context
    clear_request_user_context()

    # Verify with original session (no RLS context) that work is still unchanged
    db_session.expire_all()  # Clear SQLAlchemy cache
    db_session.refresh(work_a)
    assert work_a.text == "そよぐ道を花びらが舞う", f"RLS failed: Work was modified (got: {work_a.text})"


def test_rls_own_work_update(db_session: Session, user_a: User, theme: Theme):
    """Test that users CAN update their own works."""
    settings = get_settings()

    # Skip test if not using PostgreSQL
    if not settings.database_url.startswith("postgresql"):
        pytest.skip("RLS tests require PostgreSQL")

    now = datetime.now(timezone.utc)

    # User A creates a work
    work_a = Work(
        id=str(uuid4()),
        user_id=user_a.id,
        theme_id=theme.id,
        text="そよぐ道を花びらが舞う",
        created_at=now,
        updated_at=now,
    )
    db_session.add(work_a)
    db_session.commit()
    db_session.refresh(work_a)

    # Set context as User A
    set_request_user_context(user_a.id, "authenticated")

    # Create new session with User A's context
    from app.db.session import get_db_session

    session_gen = get_db_session()
    test_session = next(session_gen)

    try:
        # User A should be able to update their own work
        result = test_session.execute(
            text("UPDATE works SET text = :new_text WHERE id = :work_id RETURNING text"),
            {"new_text": "新しい道を歩む", "work_id": work_a.id}
        )
        # If RLS is working, UPDATE should succeed and return the new text
        updated_text = result.scalar()
        assert updated_text == "新しい道を歩む", f"RLS failed: User A could not update their own work (got: {updated_text})"
        test_session.commit()

    finally:
        test_session.close()

    # Clean up context
    clear_request_user_context()

    # Verify with original session that work was actually updated
    db_session.expire_all()
    db_session.refresh(work_a)
    assert work_a.text == "新しい道を歩む", f"Update did not persist (got: {work_a.text})"


def test_rls_service_role_bypass(db_session: Session, user_a: User, theme: Theme):
    """Test that service_role can bypass RLS restrictions."""
    settings = get_settings()

    # Skip test if not using PostgreSQL
    if not settings.database_url.startswith("postgresql"):
        pytest.skip("RLS tests require PostgreSQL")

    now = datetime.now(timezone.utc)

    # Create a work for User A
    work_a = Work(
        id=str(uuid4()),
        user_id=user_a.id,
        theme_id=theme.id,
        text="そよぐ道を花びらが舞う",
        created_at=now,
        updated_at=now,
    )
    db_session.add(work_a)
    db_session.commit()
    db_session.refresh(work_a)

    # Set context as service_role (not the work owner)
    service_user_id = str(uuid4())
    set_request_user_context(service_user_id, "service_role")

    # Create new session with service_role context
    from app.db.session import get_db_session

    session_gen = get_db_session()
    test_session = next(session_gen)

    try:
        # service_role should be able to update any work
        result = test_session.execute(
            text("UPDATE works SET text = :new_text WHERE id = :work_id RETURNING text"),
            {"new_text": "サービス管理者による修正", "work_id": work_a.id}
        )
        # service_role should be able to update even if not the owner
        updated_text = result.scalar()
        assert updated_text == "サービス管理者による修正", f"RLS failed: service_role could not bypass restrictions (got: {updated_text})"
        test_session.commit()

    finally:
        test_session.close()

    # Clean up context
    clear_request_user_context()

    # Verify with original session that work was actually updated
    db_session.expire_all()
    db_session.refresh(work_a)
    assert work_a.text == "サービス管理者による修正", f"Update did not persist (got: {work_a.text})"
