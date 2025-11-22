"""Database session utilities."""

from collections.abc import Generator
from contextvars import ContextVar

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

_engine_kwargs: dict[str, object] = {
    "pool_pre_ping": True,  # Test connections before using them
    "pool_size": 5,  # Maximum number of permanent connections
    "max_overflow": 10,  # Maximum number of connections that can be created beyond pool_size
    "pool_recycle": 3600,  # Recycle connections after 1 hour
    "pool_timeout": 30,  # Timeout for getting a connection from the pool
    "future": True,
}

if settings.database_url.startswith("sqlite"):  # pragma: no cover - branch tested via sqlite URL
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
elif "pooler.supabase.com" in settings.database_url:
    # Connection pooler requires different SSL settings
    _engine_kwargs["connect_args"] = {
        "sslmode": "require",  # Require SSL connection
        "connect_timeout": 10,  # Connection timeout in seconds
    }

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# Context variables for storing authenticated user info per request
_request_user_id: ContextVar[str | None] = ContextVar("request_user_id", default=None)
_request_user_role: ContextVar[str | None] = ContextVar("request_user_role", default=None)


def set_request_user_context(user_id: str, role: str = "authenticated") -> None:
    """Set the current request user context for RLS policies.

    Args:
        user_id: The authenticated user's identifier
        role: The user's role (authenticated or service_role)
    """
    _request_user_id.set(user_id)
    _request_user_role.set(role)


def clear_request_user_context() -> None:
    """Clear the request user context."""
    _request_user_id.set(None)
    _request_user_role.set(None)


def _set_session_context(session: Session, user_id: str | None, role: str | None) -> None:
    """Set PostgreSQL GUC variables for Row Level Security.

    This sets app.current_uid and app.current_role which are used by
    RLS policies defined in SCHEMA.sql.

    Args:
        session: The database session
        user_id: The authenticated user's identifier
        role: The user's role (authenticated or service_role)
    """
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        # RLS only works with PostgreSQL
        return

    try:
        if user_id:
            # Use set_config() function for custom GUC variables
            session.execute(
                text("SELECT set_config('app.current_uid', :uid, true)"),
                {"uid": user_id}
            )
            logger.debug(f"Set app.current_uid = {user_id}")

        if role:
            # Use set_config() function for custom GUC variables
            session.execute(
                text("SELECT set_config('app.current_role', :role, true)"),
                {"role": role}
            )
            logger.debug(f"Set app.current_role = {role}")
    except Exception as exc:
        logger.warning(f"Failed to set session context variables: {exc}")
        # Don't fail the request if GUC setting fails


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session with RLS context.

    This function automatically sets PostgreSQL GUC variables (app.current_uid
    and app.current_role) from the request context, enabling Row Level Security
    policies to work correctly.
    """
    session: Session = SessionLocal()
    try:
        # Set RLS context from request-scoped variables
        user_id = _request_user_id.get()
        role = _request_user_role.get()

        if user_id or role:
            _set_session_context(session, user_id, role)

        yield session
    finally:
        session.close()


def get_db_session_with_user(
    user_id: str,
    role: str = "authenticated",
) -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session with explicit user context.

    This version receives user_id as a parameter to ensure GUC variables are set
    before the session is used.

    Args:
        user_id: The authenticated user's identifier
        role: The user's role (authenticated or service_role)
    """
    session: Session = SessionLocal()
    try:
        # Set RLS context with explicit user info
        _set_session_context(session, user_id, role)

        yield session
    finally:
        session.close()


def get_authenticated_db_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields an authenticated database session.

    This function MUST be used with Depends(get_current_user_id) to ensure
    proper RLS context. It re-reads the ContextVar to get the user info set
    by get_current_user_id.

    Usage:
        @router.post("/works")
        def create_work(
            user_id: Annotated[str, Depends(get_current_user_id)],  # ← Must be first
            session: Annotated[Session, Depends(get_authenticated_db_session)],  # ← Then this
        ):
            ...
    """
    session: Session = SessionLocal()
    try:
        # Re-read ContextVar to get the values set by get_current_user_id
        ctx_user_id = _request_user_id.get()
        ctx_role = _request_user_role.get()

        # Set RLS context if available
        if ctx_user_id or ctx_role:
            _set_session_context(session, ctx_user_id, ctx_role)

        yield session
    finally:
        session.close()
