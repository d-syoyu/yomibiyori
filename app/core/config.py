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
    supabase_url: str = Field(
        default="https://dev-project.supabase.co",
        alias="SUPABASE_URL",
        description="Base URL of the Supabase project.",
    )
    supabase_anon_key: str | None = Field(
        default=None,
        alias="SUPABASE_ANON_KEY",
        description="Optional anon key used for public Supabase client calls.",
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
    supabase_request_timeout: float = Field(
        default=5.0,
        alias="SUPABASE_REQUEST_TIMEOUT",
        description="Timeout in seconds for Supabase HTTP calls.",
    )
    supabase_jwks_cache_ttl_seconds: int = Field(
        default=3600,
        alias="SUPABASE_JWKS_CACHE_TTL",
        description="Maximum age in seconds before JWKS cache refresh.",
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
    r2_account_id: str | None = Field(
        default=None,
        alias="R2_ACCOUNT_ID",
        description="Cloudflare R2 account identifier.",
    )
    r2_access_key_id: str | None = Field(
        default=None,
        alias="R2_ACCESS_KEY_ID",
        description="Cloudflare R2 access key.",
    )
    r2_secret_access_key: str | None = Field(
        default=None,
        alias="R2_SECRET_ACCESS_KEY",
        description="Cloudflare R2 secret key.",
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
    expo_access_token: str | None = Field(
        default=None,
        alias="EXPO_ACCESS_TOKEN",
        description="Expo access token for push notifications.",
    )
    sentry_dsn: str | None = Field(
        default=None,
        alias="SENTRY_DSN",
        description="Sentry DSN for error reporting.",
    )
    posthog_api_key: str | None = Field(
        default=None,
        alias="POSTHOG_API_KEY",
        description="PostHog API key for analytics.",
    )
    app_env: str = Field(
        default="development",
        alias="APP_ENV",
        description="Application environment label.",
    )
    debug: bool = Field(
        default=False,
        alias="DEBUG",
        description="Enable verbose debug mode.",
    )
    theme_categories: list[str] = Field(
        default_factory=lambda: ["general"],
        alias="THEME_CATEGORIES",
        description="List of categories for daily theme generation.",
    )
    theme_generation_max_retries: int = Field(
        default=3,
        alias="THEME_GENERATION_MAX_RETRIES",
        description="Maximum retry attempts when generating a theme via AI.",
        ge=1,
    )
    theme_generation_retry_delay_seconds: float = Field(
        default=0.0,
        alias="THEME_GENERATION_RETRY_DELAY_SECONDS",
        description="Delay in seconds between theme generation retries.",
        ge=0.0,
    )
    theme_ai_provider: str = Field(
        default="openai",
        alias="THEME_AI_PROVIDER",
        description="Provider used for theme generation AI (openai).",
    )
    openai_api_key: str | None = Field(
        default=None,
        alias="OPENAI_API_KEY",
        description="OpenAI API key used when THEME_AI_PROVIDER=openai.",
    )
    openai_model: str = Field(
        default="gpt-4o-mini",
        alias="OPENAI_MODEL",
        description="OpenAI model used for theme generation.",
    )
    openai_timeout: float = Field(
        default=15.0,
        alias="OPENAI_TIMEOUT",
        description="Timeout in seconds for OpenAI API calls.",
        ge=1.0,
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def timezone(self) -> ZoneInfo:
        """Return the configured application timezone."""
        return ZoneInfo(self.timezone_name)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()
