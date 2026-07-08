"""Application settings.

Environment-driven configuration via pydantic-settings with fail-fast
validation: an invalid production configuration prevents startup instead of
failing at first use. Secrets use ``SecretStr`` so ``repr(settings)`` never
leaks credentials (docs/architecture/24-security.md).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_JWT_SECRETS = frozenset(
    {
        "",
        "dev-only-change-me-in-production-0000",
        "changeme",
        "secret",
    }
)


class Settings(BaseSettings):
    """All environment variables consumed by the API, workers, and tools."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    # ── Logging ───────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["console", "json"] = "console"

    # ── Security ──────────────────────────────────────────────────────
    jwt_secret: SecretStr = SecretStr("dev-only-change-me-in-production-0000")

    # ── PostgreSQL ────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://mlcopilot:mlcopilot@localhost:5432/mlcopilot"
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_max_overflow: int = Field(default=10, ge=0, le=100)
    database_pool_timeout_seconds: float = Field(default=30.0, gt=0)

    # ── Redis ─────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_socket_timeout_seconds: float = Field(default=5.0, gt=0)

    # ── Neo4j (client wiring arrives with the knowledge-graph feature) ─
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: SecretStr = SecretStr("mlcopilot-dev")

    # ── MinIO (client wiring arrives with the uploads feature) ────────
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "mlcopilot"
    minio_secret_key: SecretStr = SecretStr("mlcopilot-dev-secret")
    minio_secure: bool = False
    minio_bucket: str = "mlcopilot"

    # ── AI providers (wiring arrives with the ai/ layer) ──────────────
    ai_provider: Literal["anthropic", "openai", "gemini", "ollama", "openrouter"] = "anthropic"
    anthropic_api_key: SecretStr = SecretStr("")
    openai_api_key: SecretStr = SecretStr("")
    google_api_key: SecretStr = SecretStr("")
    openrouter_api_key: SecretStr = SecretStr("")
    ollama_base_url: str = ""

    # ── Integrations (wiring arrives with the integrations feature) ───
    github_token: SecretStr = SecretStr("")
    mlflow_tracking_uri: str = ""

    # ── Health checks ─────────────────────────────────────────────────
    health_check_timeout_seconds: float = Field(default=2.0, gt=0)

    @property
    def cors_origin_list(self) -> list[str]:
        """Exact-origin CORS allow-list, parsed from a comma-separated value."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def _fail_fast(self) -> Self:
        if not self.database_url.startswith("postgresql+asyncpg://"):
            msg = (
                "DATABASE_URL must use the async driver "
                "(postgresql+asyncpg://...), got a different scheme."
            )
            raise ValueError(msg)
        if not self.redis_url.startswith(("redis://", "rediss://", "unix://")):
            msg = "REDIS_URL must be a redis://, rediss://, or unix:// URL."
            raise ValueError(msg)
        if self.is_production:
            secret = self.jwt_secret.get_secret_value()
            if secret in _INSECURE_JWT_SECRETS or len(secret) < 32:
                msg = (
                    "JWT_SECRET is unset or insecure for production. "
                    "Generate one with: openssl rand -hex 32"
                )
                raise ValueError(msg)
            if not self.cors_origin_list:
                msg = "CORS_ORIGINS must list at least one exact origin in production."
                raise ValueError(msg)
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton; import-time cheap, validated once."""
    return Settings()
