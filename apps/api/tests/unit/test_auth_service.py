"""Unit tests for AuthService orchestration logic.

Uses in-memory fakes for repositories and fast security components.
No database required.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pytest

from mlcopilot.domain.api_key import ApiKey
from mlcopilot.domain.errors import AuthenticationError, ConflictError
from mlcopilot.domain.refresh_token import RefreshToken
from mlcopilot.domain.user import User
from mlcopilot.features.auth.service import AuthService
from mlcopilot.infrastructure.security.api_key import ApiKeyManager
from mlcopilot.infrastructure.security.jwt import JWTManager
from mlcopilot.infrastructure.security.password import PasswordHasher

if TYPE_CHECKING:
    pass


# ── In-memory repository fakes ───────────────────────────────────────


class FakeUserRepository:
    """In-memory user store for testing."""

    def __init__(self) -> None:
        self._users: dict[uuid.UUID, User] = {}

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self._users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        email_lower = email.lower()
        for user in self._users.values():
            if user.email.lower() == email_lower:
                return user
        return None

    async def add(self, user: User) -> None:
        self._users[user.id] = user

    async def update(self, user: User) -> None:
        self._users[user.id] = user


class FakeRefreshTokenRepository:
    """In-memory refresh token store for testing."""

    def __init__(self) -> None:
        self._tokens: dict[uuid.UUID, RefreshToken] = {}

    async def get_by_id(self, token_id: uuid.UUID) -> RefreshToken | None:
        return self._tokens.get(token_id)

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        for token in self._tokens.values():
            if token.token_hash == token_hash:
                return token
        return None

    async def list_active_by_family(self, family_id: uuid.UUID) -> list[RefreshToken]:
        return [
            t
            for t in self._tokens.values()
            if t.family_id == family_id
            and t.revoked_at is None
            and t.expires_at > datetime.now(UTC)
        ]

    async def add(self, token: RefreshToken) -> None:
        self._tokens[token.id] = token

    async def update(self, token: RefreshToken) -> None:
        self._tokens[token.id] = token

    async def revoke_family(self, family_id: uuid.UUID) -> None:
        now = datetime.now(UTC)
        for token in self._tokens.values():
            if token.family_id == family_id and token.revoked_at is None:
                token.revoked_at = now


class FakeApiKeyRepository:
    """In-memory API key store for testing."""

    def __init__(self) -> None:
        self._keys: dict[uuid.UUID, ApiKey] = {}

    async def get_by_id(self, key_id: uuid.UUID) -> ApiKey | None:
        return self._keys.get(key_id)

    async def get_by_hash(self, key_hash: str) -> ApiKey | None:
        for key in self._keys.values():
            if key.key_hash == key_hash:
                return key
        return None

    async def list_active_for_user(self, user_id: uuid.UUID) -> list[ApiKey]:
        return [
            k
            for k in self._keys.values()
            if k.user_id == user_id and k.revoked_at is None
        ]

    async def add(self, api_key: ApiKey) -> None:
        self._keys[api_key.id] = api_key

    async def update(self, api_key: ApiKey) -> None:
        self._keys[api_key.id] = api_key


# ── Fixtures ──────────────────────────────────────────────────────────


_TEST_SECRET = "a" * 32


@pytest.fixture
def auth_service() -> AuthService:
    """AuthService wired with fakes and fast security components."""
    return AuthService(
        user_repo=FakeUserRepository(),
        refresh_token_repo=FakeRefreshTokenRepository(),
        api_key_repo=FakeApiKeyRepository(),
        password_hasher=PasswordHasher(time_cost=1, memory_cost=8192),
        jwt_manager=JWTManager(secret=_TEST_SECRET),
        api_key_manager=ApiKeyManager(),
    )


# ── Registration ──────────────────────────────────────────────────────


async def test_register_creates_user(auth_service: AuthService) -> None:
    user = await auth_service.register(
        email="alice@example.com",
        password="strong-password-123",
        full_name="Alice Smith",
    )

    assert user.email == "alice@example.com"
    assert user.full_name == "Alice Smith"
    assert user.is_active is True
    assert user.is_superuser is False
    # Password must be hashed, not stored as plaintext.
    assert user.password_hash != "strong-password-123"  # noqa: S105
    assert user.password_hash.startswith("$argon2id$")


async def test_register_duplicate_email_raises(auth_service: AuthService) -> None:
    await auth_service.register(
        email="bob@example.com",
        password="password-one",
        full_name="Bob",
    )
    with pytest.raises(ConflictError, match="already exists"):
        await auth_service.register(
            email="bob@example.com",
            password="password-two",
            full_name="Bob Again",
        )


# ── Login ─────────────────────────────────────────────────────────────


async def test_login_returns_token_pair(auth_service: AuthService) -> None:
    await auth_service.register(
        email="carol@example.com",
        password="correct-password",
        full_name="Carol",
    )
    access_token, raw_refresh = await auth_service.login(
        email="carol@example.com",
        password="correct-password",
    )

    assert isinstance(access_token, str)
    assert len(access_token) > 0
    assert isinstance(raw_refresh, str)
    assert len(raw_refresh) > 0


async def test_login_wrong_password_raises(auth_service: AuthService) -> None:
    await auth_service.register(
        email="dave@example.com",
        password="real-password",
        full_name="Dave",
    )
    with pytest.raises(AuthenticationError, match="Invalid email or password"):
        await auth_service.login(
            email="dave@example.com",
            password="wrong-password",
        )


async def test_login_unknown_email_raises(auth_service: AuthService) -> None:
    with pytest.raises(AuthenticationError, match="Invalid email or password"):
        await auth_service.login(
            email="nobody@example.com",
            password="anything",
        )


async def test_login_deactivated_user_raises(auth_service: AuthService) -> None:
    user = await auth_service.register(
        email="eve@example.com",
        password="valid-password",
        full_name="Eve",
    )
    user.is_active = False
    # Update the user in the fake repo through the service's internal repo.
    await auth_service._users.update(user)

    with pytest.raises(AuthenticationError, match="deactivated"):
        await auth_service.login(
            email="eve@example.com",
            password="valid-password",
        )


# ── Token refresh ─────────────────────────────────────────────────────


async def test_refresh_returns_new_token_pair(auth_service: AuthService) -> None:
    await auth_service.register(
        email="frank@example.com",
        password="password",
        full_name="Frank",
    )
    _, raw_refresh = await auth_service.login(
        email="frank@example.com",
        password="password",
    )

    new_access, new_refresh = await auth_service.refresh(
        raw_refresh_token=raw_refresh,
    )

    assert isinstance(new_access, str)
    assert isinstance(new_refresh, str)
    # The new refresh token must differ from the consumed one.
    assert new_refresh != raw_refresh


async def test_refresh_invalid_token_raises(auth_service: AuthService) -> None:
    with pytest.raises(AuthenticationError, match="Invalid refresh token"):
        await auth_service.refresh(raw_refresh_token="bogus-token")


async def test_refresh_expired_token_raises(auth_service: AuthService) -> None:
    await auth_service.register(
        email="grace@example.com",
        password="password",
        full_name="Grace",
    )
    _, raw_refresh = await auth_service.login(
        email="grace@example.com",
        password="password",
    )

    # Expire the stored token by mutating it in the fake repo.
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    stored = await auth_service._refresh_tokens.get_by_hash(token_hash)
    assert stored is not None
    stored.expires_at = datetime.now(UTC) - timedelta(seconds=1)

    with pytest.raises(AuthenticationError, match="expired"):
        await auth_service.refresh(raw_refresh_token=raw_refresh)


async def test_refresh_reuse_revokes_family(auth_service: AuthService) -> None:
    """Stolen-token detection: reusing an already-rotated token revokes the family."""
    await auth_service.register(
        email="heidi@example.com",
        password="password",
        full_name="Heidi",
    )
    _, raw_refresh_1 = await auth_service.login(
        email="heidi@example.com",
        password="password",
    )

    # First refresh: consumes token 1, issues token 2.
    _, raw_refresh_2 = await auth_service.refresh(
        raw_refresh_token=raw_refresh_1,
    )

    # Reuse token 1 → stolen-token detection.
    with pytest.raises(AuthenticationError, match="reuse detected"):
        await auth_service.refresh(raw_refresh_token=raw_refresh_1)

    # Token 2 must also be revoked (entire family revoked).
    token_2_hash = hashlib.sha256(raw_refresh_2.encode()).hexdigest()
    token_2 = await auth_service._refresh_tokens.get_by_hash(token_2_hash)
    assert token_2 is not None
    assert token_2.revoked_at is not None


# ── Logout ────────────────────────────────────────────────────────────


async def test_logout_revokes_family(auth_service: AuthService) -> None:
    await auth_service.register(
        email="ivan@example.com",
        password="password",
        full_name="Ivan",
    )
    _, raw_refresh = await auth_service.login(
        email="ivan@example.com",
        password="password",
    )

    await auth_service.logout(raw_refresh_token=raw_refresh)

    # The token's family should be fully revoked.
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    stored = await auth_service._refresh_tokens.get_by_hash(token_hash)
    assert stored is not None
    assert stored.revoked_at is not None


async def test_logout_invalid_token_raises(auth_service: AuthService) -> None:
    with pytest.raises(AuthenticationError, match="Invalid refresh token"):
        await auth_service.logout(raw_refresh_token="bogus")


# ── API key creation ──────────────────────────────────────────────────


async def test_create_api_key_returns_full_key(auth_service: AuthService) -> None:
    user = await auth_service.register(
        email="judy@example.com",
        password="password",
        full_name="Judy",
    )

    full_key, api_key = await auth_service.create_api_key(
        user_id=user.id,
        name="CI Key",
        scopes=["read", "write"],
    )

    assert full_key.startswith("mlc_")
    assert api_key.name == "CI Key"
    assert api_key.scopes == ["read", "write"]
    assert api_key.user_id == user.id
    assert api_key.revoked_at is None
    # The stored hash must match the full key.
    assert ApiKeyManager.verify_key(full_key, api_key.key_hash)
