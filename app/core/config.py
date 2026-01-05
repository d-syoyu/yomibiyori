"""Application configuration for Yomibiyori backend."""

from functools import lru_cache
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator
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
    r2_bucket_name: str = Field(
        default="yomibiyori",
        alias="R2_BUCKET_NAME",
        description="Cloudflare R2 bucket name.",
    )
    r2_public_url: str | None = Field(
        default=None,
        alias="R2_PUBLIC_URL",
        description="Cloudflare R2 public URL (e.g., https://pub-xxx.r2.dev).",
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
    theme_day_rollover_hour: int = Field(
        default=6,
        alias="THEME_DAY_ROLLOVER_HOUR",
        description="Hour in local timezone when the theme day advances to the next date (0-23).",
        ge=0,
        le=23,
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
    theme_categories: str = Field(
        default="general,nature,emotion,season,event",
        alias="THEME_CATEGORIES",
        description="Comma-separated list of categories for daily theme generation.",
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
        default="xai",
        alias="THEME_AI_PROVIDER",
        description="Provider used for theme generation AI (openai, claude, or xai).",
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
    anthropic_api_key: str | None = Field(
        default=None,
        alias="ANTHROPIC_API_KEY",
        description="Anthropic API key used when THEME_AI_PROVIDER=claude.",
    )
    claude_model: str = Field(
        default="claude-sonnet-4-5-20250929",
        alias="CLAUDE_MODEL",
        description="Claude model used for theme generation.",
    )
    claude_timeout: float = Field(
        default=30.0,
        alias="CLAUDE_TIMEOUT",
        description="Timeout in seconds for Claude API calls.",
        ge=1.0,
    )
    xai_api_key: str | None = Field(
        default=None,
        alias="XAI_API_KEY",
        description="X.ai API key used when THEME_AI_PROVIDER=xai.",
    )
    xai_model: str = Field(
        default="grok-4-1-fast-reasoning",
        alias="XAI_MODEL",
        description="X.ai Grok model used for theme generation.",
    )
    xai_timeout: float = Field(
        default=30.0,
        alias="XAI_TIMEOUT",
        description="Timeout in seconds for X.ai API calls.",
        ge=1.0,
    )
    oauth_allowed_redirect_hosts: str = Field(
        default="localhost,127.0.0.1",
        alias="OAUTH_ALLOWED_REDIRECT_HOSTS",
        description="Comma-separated list of hostnames allowed in OAuth redirect_to parameters.",
    )
    expo_access_token: str | None = Field(
        default=None,
        alias="EXPO_ACCESS_TOKEN",
        description="Bearer token for Expo Push API requests.",
    )
    expo_push_api_url: str = Field(
        default="https://exp.host/--/api/v2/push/send",
        alias="EXPO_PUSH_API_URL",
        description="Expo Push API endpoint.",
    )
    expo_push_timeout: float = Field(
        default=15.0,
        alias="EXPO_PUSH_TIMEOUT",
        description="Timeout (seconds) for Expo Push API calls.",
        ge=1.0,
    )
    stripe_api_key: str | None = Field(
        default=None,
        alias="STRIPE_API_KEY",
        description="Stripe secret API key for payment processing.",
    )
    stripe_publishable_key: str | None = Field(
        default=None,
        alias="STRIPE_PUBLISHABLE_KEY",
        description="Stripe publishable key for client-side.",
    )
    stripe_webhook_secret: str | None = Field(
        default=None,
        alias="STRIPE_WEBHOOK_SECRET",
        description="Stripe webhook signing secret for verifying webhook events.",
    )
    sponsor_credit_price_jpy: int = Field(
        default=11000,
        alias="SPONSOR_CREDIT_PRICE_JPY",
        description="Price of one sponsor credit in Japanese Yen.",
        ge=1,
    )
    notification_batch_size: int = Field(
        default=100,
        alias="NOTIFICATION_BATCH_SIZE",
        description="Maximum number of push messages per HTTP batch (Expo max 100).",
        ge=1,
        le=100,
    )
    resend_api_key: str | None = Field(
        default=None,
        alias="RESEND_API_KEY",
        description="Resend API key for transactional emails.",
    )
    resend_from_email: str = Field(
        default="よみびより <noreply@yomibiyori.app>",
        alias="RESEND_FROM_EMAIL",
        description="Sender email address for Resend emails.",
    )

    # .env.localがあれば.envより優先（ローカル開発用）
    model_config = SettingsConfigDict(
        env_file=[".env", ".env.local"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def theme_categories_list(self) -> list[str]:
        """Return theme categories as a list."""
        return [cat.strip() for cat in self.theme_categories.split(",") if cat.strip()]

    @property
    def timezone(self) -> ZoneInfo:
        """Return the configured application timezone."""
        return ZoneInfo(self.timezone_name)

    @property
    def oauth_allowed_redirect_entries(self) -> list[tuple[str | None, str | None]]:
        """Return allowed OAuth redirect (scheme, host) pairs."""
        entries: list[tuple[str | None, str | None]] = []
        for raw_entry in self.oauth_allowed_redirect_hosts.split(","):
            token = raw_entry.strip()
            if not token:
                continue
            if "://" in token:
                parsed = urlparse(token)
                scheme = parsed.scheme.lower() if parsed.scheme else None
                host = parsed.hostname.lower() if parsed.hostname else None
                entries.append((scheme, host))
            else:
                entries.append((None, token.lower()))
        return entries


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()
