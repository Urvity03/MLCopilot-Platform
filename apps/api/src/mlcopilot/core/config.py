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
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

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

    # ── AI / LLM ───────────────────────────────────────────────────────
    llm_provider: Literal["ollama", "gemini", "openrouter"] = "ollama"

    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen3:8b"

    gemini_api_key: SecretStr = SecretStr("")
    google_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-3.6-flash"

    @property
    def effective_gemini_api_key(self) -> SecretStr:
        """Return gemini_api_key if set, falling back to google_api_key."""
        key_val = self.gemini_api_key.get_secret_value().strip()
        if key_val:
            return self.gemini_api_key
        return self.google_api_key

    embedding_model_name: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    rag_similarity_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    rag_max_chunks: int = Field(default=3, ge=1, le=10)
    # ── Integrations (wiring arrives with the integrations feature) ─── github_token: SecretStr = SecretStr("") mlflow_tracking_uri: str = ""

    # ── OAuth ──────────────────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: SecretStr = SecretStr("")
    github_client_id: str = ""
    github_client_secret: SecretStr = SecretStr("")
    oauth_redirect_base: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    # ── SMTP (optional, for password reset) ───────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from_email: str = "noreply@mlcopilot.dev"

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
                raise ValueError("JWT_SECRET must be set to a cryptographically random secret of at least 32 bytes in production.")
            if not self.cors_origin_list:
                self.cors_origins = "https://mlcopilot-two.vercel.app"
            if self.oauth_redirect_base == "http://localhost:8000":
                self.oauth_redirect_base = "https://mlcopilot-two.vercel.app"
            if self.frontend_url == "http://localhost:3000":
                self.frontend_url = "https://mlcopilot-two.vercel.app"
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton; import-time cheap, validated once."""
    return Settings()
