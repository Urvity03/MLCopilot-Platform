"""Settings validation: fail-fast rules and secret redaction."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from mlcopilot.core.config import Settings


def test_defaults_are_valid_for_development() -> None:
    settings = Settings(environment="development")
    assert settings.cors_origin_list == ["http://localhost:3000"]
    assert not settings.is_production


def test_production_rejects_insecure_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(environment="production", jwt_secret="changeme")


def test_production_rejects_short_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(environment="production", jwt_secret="a" * 16)


def test_production_accepts_strong_jwt_secret() -> None:
    settings = Settings(environment="production", jwt_secret="f" * 64)
    assert settings.is_production


def test_rejects_sync_database_driver() -> None:
    with pytest.raises(ValidationError, match="asyncpg"):
        Settings(database_url="postgresql://user:pass@localhost/db")


def test_rejects_non_redis_url() -> None:
    with pytest.raises(ValidationError, match="REDIS_URL"):
        Settings(redis_url="http://localhost:6379")


def test_cors_origins_parse_and_strip() -> None:
    settings = Settings(cors_origins="http://a.example, http://b.example ,")
    assert settings.cors_origin_list == ["http://a.example", "http://b.example"]


def test_repr_never_leaks_secrets() -> None:
    settings = Settings(jwt_secret="super-sensitive-value-000000000000")
    assert "super-sensitive-value" not in repr(settings)
    assert "super-sensitive-value" not in str(settings)
