"""Tests for infrastructure/security components.

Covers password hashing, JWT creation/decoding, and API key generation.
"""

from __future__ import annotations

import uuid

import pytest

from mlcopilot.domain.errors import AuthenticationError
from mlcopilot.infrastructure.security.api_key import ApiKeyManager
from mlcopilot.infrastructure.security.jwt import JWTManager, TokenPayload
from mlcopilot.infrastructure.security.password import PasswordHasher

# Use fast Argon2 parameters for test speed.
_TEST_HASHER = PasswordHasher(time_cost=1, memory_cost=8192)
_TEST_SECRET = "a" * 32
_TEST_JWT = JWTManager(secret=_TEST_SECRET)


# ── Password hashing ─────────────────────────────────────────────────


def test_password_hash_produces_argon2id_string() -> None:
    hashed = _TEST_HASHER.hash("my-password")
    assert hashed.startswith("$argon2id$")


def test_password_verify_correct_password() -> None:
    hashed = _TEST_HASHER.hash("correct-password")
    assert _TEST_HASHER.verify("correct-password", hashed) is True


def test_password_verify_wrong_password() -> None:
    hashed = _TEST_HASHER.hash("correct-password")
    assert _TEST_HASHER.verify("wrong-password", hashed) is False


# ── JWT ───────────────────────────────────────────────────────────────


def test_jwt_create_and_decode_round_trip() -> None:
    user_id = uuid.uuid4()
    token = _TEST_JWT.create_access_token(user_id)

    payload = _TEST_JWT.decode_access_token(token)
    assert isinstance(payload, TokenPayload)
    assert payload.sub == user_id
    assert payload.token_type == "access"  # noqa: S105
    assert payload.jti is not None


def test_jwt_decode_invalid_token_raises() -> None:
    with pytest.raises(AuthenticationError, match="Invalid access token"):
        _TEST_JWT.decode_access_token("not.a.valid.token")


def test_jwt_decode_tampered_token_raises() -> None:
    user_id = uuid.uuid4()
    token = _TEST_JWT.create_access_token(user_id)

    # Tamper with the payload section.
    parts = token.split(".")
    parts[1] = parts[1][::-1]  # reverse the payload
    tampered = ".".join(parts)

    with pytest.raises(AuthenticationError):
        _TEST_JWT.decode_access_token(tampered)


def test_jwt_decode_wrong_secret_raises() -> None:
    user_id = uuid.uuid4()
    token = _TEST_JWT.create_access_token(user_id)

    other_manager = JWTManager(secret="b" * 32)
    with pytest.raises(AuthenticationError, match="Invalid access token"):
        other_manager.decode_access_token(token)


def test_jwt_secret_too_short_raises() -> None:
    with pytest.raises(ValueError, match="at least 32 characters"):
        JWTManager(secret="short")


def test_jwt_expired_token_raises() -> None:
    from datetime import UTC, datetime, timedelta

    import jwt as pyjwt

    payload = {
        "sub": str(uuid.uuid4()),
        "exp": datetime.now(UTC) - timedelta(seconds=1),
        "iat": datetime.now(UTC) - timedelta(minutes=16),
        "jti": str(uuid.uuid4()),
        "type": "access",
    }
    expired_token = pyjwt.encode(payload, _TEST_SECRET, algorithm="HS256")

    with pytest.raises(AuthenticationError, match="expired"):
        _TEST_JWT.decode_access_token(expired_token)


# ── API key ───────────────────────────────────────────────────────────


def test_api_key_generate_format() -> None:
    full_key, prefix, key_hash = ApiKeyManager.generate()

    # Format: mlc_<8-char prefix>_<secret>
    parts = full_key.split("_", 2)
    assert parts[0] == "mlc"
    assert len(parts[1]) == 8
    assert len(parts) == 3

    assert prefix == parts[1]
    assert len(key_hash) == 64  # SHA-256 hex digest


def test_api_key_verify_correct() -> None:
    full_key, _, key_hash = ApiKeyManager.generate()
    assert ApiKeyManager.verify_key(full_key, key_hash) is True


def test_api_key_verify_wrong_key() -> None:
    _, _, key_hash = ApiKeyManager.generate()
    assert ApiKeyManager.verify_key("mlc_fake0000_wrong", key_hash) is False


def test_api_key_hash_deterministic() -> None:
    hash1 = ApiKeyManager.hash_key("mlc_abcd1234_secret")
    hash2 = ApiKeyManager.hash_key("mlc_abcd1234_secret")
    assert hash1 == hash2


def test_api_key_generate_unique() -> None:
    results = {ApiKeyManager.generate()[0] for _ in range(10)}
    assert len(results) == 10  # all keys should be unique
