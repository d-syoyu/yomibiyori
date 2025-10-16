"""Shared pytest fixtures."""

from __future__ import annotations

from collections.abc import Generator

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.redis import get_redis_client
from app.main import app
from app.models import Base
from app.db.session import get_db_session

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, future=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(autouse=True)
def prepare_database() -> Generator[None, None, None]:
    """Keep database schema fresh for every test."""

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Provide a database session bound to the test database."""

    session: Session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def redis_client() -> Generator[fakeredis.FakeRedis, None, None]:
    """Provide an isolated in-memory Redis instance."""

    client = fakeredis.FakeRedis(decode_responses=True)
    try:
        yield client
    finally:
        client.flushall()


@pytest.fixture()
def client(db_session: Session, redis_client: fakeredis.FakeRedis) -> Generator[TestClient, None, None]:
    """FastAPI test client with dependency overrides."""

    def _get_test_session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db_session] = _get_test_session
    app.dependency_overrides[get_redis_client] = lambda: redis_client
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
