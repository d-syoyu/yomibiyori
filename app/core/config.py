"""Application configuration for Yomibiyori backend."""

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = Field(
        default="sqlite:///./yomibiyori.db",
        alias="DATABASE_URL",
        description="SQLAlchemy compatible database URL.",
    )
    supabase_project_ref: str = Field(
        default="dev-project",
        alias="SUPABASE_PROJECT_REF",
        description="Supabase project reference used in issuer verification.",
    )
    supabase_jwt_secret: str | None = Field(
        default="dev-secret",
        alias="SUPABASE_JWT_SECRET",
        description="Optional HS256 secret for local development.",
    )
    supabase_jwt_audience: str = Field(
        default="authenticated",
        alias="SUPABASE_JWT_AUDIENCE",
        description="Expected JWT audience claim.",
    )
    supabase_jwks_url: str = Field(
        default="https://dev-project.supabase.co/auth/v1/keys",
        alias="SUPABASE_JWKS_URL",
        description="URL of the Supabase JWKS endpoint.",
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        alias="REDIS_URL",
        description="Redis connection URL for ranking and cache.",
    )
    redis_ranking_prefix: str = Field(
        default="rankings:",
        alias="REDIS_RANKING_PREFIX",
        description="Prefix for Redis keys storing ranking ZSET data.",
    )
    service_role_key: str | None = Field(
        default=None,
        alias="SUPABASE_SERVICE_ROLE_KEY",
        description="Optional Supabase service role key for privileged operations.",
    )
    timezone_name: str = Field(
        default="Asia/Tokyo",
        alias="APP_TIMEZONE",
        description="IANA timezone used to resolve the daily theme window.",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def timezone(self) -> ZoneInfo:
        """Return the configured application timezone."""
        return ZoneInfo(self.timezone_name)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()
