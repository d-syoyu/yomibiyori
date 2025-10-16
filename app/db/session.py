"""Database session utilities."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

_engine_kwargs: dict[str, object] = {"pool_pre_ping": True, "future": True}
if settings.database_url.startswith("sqlite"):  # pragma: no cover - branch tested via sqlite URL
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""

    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
