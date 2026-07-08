"""Unit tests for the authentication API router and error mappings."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import pytest

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.domain.user import User
from mlcopilot.features.auth.deps import (
    get_api_key_repository,
    get_auth_service,
    get_refresh_token_repository,
    get_user_repository,
)
from mlcopilot.features.auth.router import _COOKIE_NAME
from mlcopilot.features.auth.service import AuthService
from mlcopilot.infrastructure.security.api_key import ApiKeyManager
from mlcopilot.infrastructure.security.jwt import JWTManager
from mlcopilot.infrastructure.security.password import PasswordHasher

if TYPE_CHECKING:
    from fastapi import FastAPI
    from httpx import AsyncClient

# ── Fakes and In-Memory Implementations for Router Tests ─────────────


class FakeUserRepository:
    def __init__(self) -> None:
        self.users: dict[uuid.UUID, User] = {}

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        email_lower = email.lower()
        for user in self.users.values():
            if user.email.lower() == email_lower:
                return user
        return None

    async def add(self, user: User) -> None:
        self.users[user.id] = user

    async def update(self, user: User) -> None:
        self.users[user.id] = user


class FakeRefreshTokenRepository:
    def __init__(self) -> None:
        self.tokens: dict[uuid.UUID, Any] = {}

    async def get_by_id(self, token_id: uuid.UUID) -> Any | None:
        return self.tokens.get(token_id)

    async def get_by_hash(self, token_hash: str) -> Any | None:
        for token in self.tokens.values():
            if token.token_hash == token_hash:
                return token
        return None

    async def list_active_by_family(self, family_id: uuid.UUID) -> list[Any]:
        return [
            t
            for t in self.tokens.values()
            if t.family_id == family_id
            and t.revoked_at is None
            and t.expires_at > datetime.now(UTC)
        ]

    async def add(self, token: Any) -> None:
        self.tokens[token.id] = token

    async def update(self, token: Any) -> None:
        self.tokens[token.id] = token

    async def revoke_family(self, family_id: uuid.UUID) -> None:
        now = datetime.now(UTC)
        for token in self.tokens.values():
            if token.family_id == family_id and token.revoked_at is None:
                token.revoked_at = now


class FakeApiKeyRepository:
    def __init__(self) -> None:
        self.keys: dict[uuid.UUID, Any] = {}

    async def get_by_id(self, key_id: uuid.UUID) -> Any | None:
        return self.keys.get(key_id)

    async def get_by_hash(self, key_hash: str) -> Any | None:
        for key in self.keys.values():
            if key.key_hash == key_hash:
                return key
        return None

    async def list_active_for_user(self, user_id: uuid.UUID) -> list[Any]:
        return [
            k
            for k in self.keys.values()
            if k.user_id == user_id and k.revoked_at is None
        ]

    async def add(self, api_key: Any) -> None:
        self.keys[api_key.id] = api_key

    async def update(self, api_key: Any) -> None:
        self.keys[api_key.id] = api_key


# ── Dependency Overrides Setup ────────────────────────────────────────

_TEST_SECRET = "a" * 32


@pytest.fixture
def fake_user_repo() -> FakeUserRepository:
    """Provide a mock user repository."""
    return FakeUserRepository()


@pytest.fixture
def fake_refresh_token_repo() -> FakeRefreshTokenRepository:
    """Provide a mock refresh token repository."""
    return FakeRefreshTokenRepository()


@pytest.fixture
def fake_api_key_repo() -> FakeApiKeyRepository:
    """Provide a mock API key repository."""
    return FakeApiKeyRepository()


@pytest.fixture
def fake_auth_service(
    fake_user_repo: FakeUserRepository,
    fake_refresh_token_repo: FakeRefreshTokenRepository,
    fake_api_key_repo: FakeApiKeyRepository,
) -> AuthService:
    """Provide a mock AuthService with fast hashing and in-memory fakes."""
    return AuthService(
        user_repo=fake_user_repo,
        refresh_token_repo=fake_refresh_token_repo,
        api_key_repo=fake_api_key_repo,
        password_hasher=PasswordHasher(time_cost=1, memory_cost=8192),
        jwt_manager=JWTManager(secret=_TEST_SECRET),
        api_key_manager=ApiKeyManager(),
    )


@pytest.fixture
def override_deps(
    app: FastAPI,
    fake_auth_service: AuthService,
    fake_user_repo: FakeUserRepository,
    fake_refresh_token_repo: FakeRefreshTokenRepository,
    fake_api_key_repo: FakeApiKeyRepository,
) -> AsyncIterator[AuthService]:
    """Override deps with fakes for the test duration."""
    test_settings = Settings(
        environment="test",
        jwt_secret=_TEST_SECRET,  # type: ignore[arg-type]
    )
    app.dependency_overrides[get_auth_service] = lambda: fake_auth_service
    app.dependency_overrides[get_user_repository] = lambda: fake_user_repo
    app.dependency_overrides[get_refresh_token_repository] = lambda: fake_refresh_token_repo
    app.dependency_overrides[get_api_key_repository] = lambda: fake_api_key_repo
    app.dependency_overrides[get_settings] = lambda: test_settings
    yield fake_auth_service
    app.dependency_overrides.pop(get_auth_service, None)
    app.dependency_overrides.pop(get_user_repository, None)
    app.dependency_overrides.pop(get_refresh_token_repository, None)
    app.dependency_overrides.pop(get_api_key_repository, None)
    app.dependency_overrides.pop(get_settings, None)


# ── Router Tests ──────────────────────────────────────────────────────


async def test_register_route_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    payload = {
        "email": "router_test@example.com",
        "password": "my-secure-password",
        "full_name": "Router Test",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "router_test@example.com"
    assert body["full_name"] == "Router Test"
    assert "id" in body


async def test_register_route_conflict(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # First registration
    payload = {
        "email": "router_conflict@example.com",
        "password": "password",
        "full_name": "Conflict Test",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # Second registration with duplicate email
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "conflict"
    assert "already exists" in body["error"]["message"]


async def test_login_route_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # Register user first
    await override_deps.register(
        email="login_ok@example.com",
        password="correct-password",
        full_name="Login Success",
    )

    payload = {"email": "login_ok@example.com", "password": "correct-password"}
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body

    # Verify cookie is set
    cookies = response.cookies
    assert _COOKIE_NAME in cookies
    assert cookies.get(_COOKIE_NAME) is not None


async def test_login_route_invalid_credentials(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # Attempt login without registration
    payload = {"email": "wrong_login@example.com", "password": "password"}
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "unauthenticated"


async def test_refresh_route_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    await override_deps.register(
        email="refresh_ok@example.com",
        password="password",
        full_name="Refresh Success",
    )
    # Login to establish cookie
    login_payload = {"email": "refresh_ok@example.com", "password": "password"}
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    refresh_cookie = login_res.cookies.get(_COOKIE_NAME)

    # Perform refresh
    client.cookies.set(_COOKIE_NAME, refresh_cookie)
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    # Verify new cookie returned
    assert _COOKIE_NAME in response.cookies


async def test_refresh_route_missing_cookie_raises(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # No cookies attached to request
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "unauthenticated"
    assert "missing" in body["error"]["message"]


async def test_logout_route_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    await override_deps.register(
        email="logout_ok@example.com",
        password="password",
        full_name="Logout Success",
    )
    login_payload = {"email": "logout_ok@example.com", "password": "password"}
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    refresh_cookie = login_res.cookies.get(_COOKIE_NAME)

    client.cookies.set(_COOKIE_NAME, refresh_cookie)
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    # The cookie should be deleted (typically returns empty or expires instantly).
    # httpx handles cookie deletion by removing it or setting its value to blank.
    assert response.cookies.get(_COOKIE_NAME) in ("", None)


async def test_create_api_key_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # Register and login to get JWT access token
    user = await override_deps.register(
        email="api_key_ok@example.com",
        password="password",
        full_name="Api Key User",
    )
    jwt_manager = JWTManager(secret=_TEST_SECRET)
    access_token = jwt_manager.create_access_token(user.id)

    payload = {"name": "Test Token", "scopes": ["read", "write"]}
    headers = {"Authorization": f"Bearer {access_token}"}
    response = await client.post("/api/v1/api-keys", json=payload, headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert "plain_key" in body
    assert body["plain_key"].startswith("mlc_")
    assert body["api_key"]["name"] == "Test Token"
    assert body["api_key"]["scopes"] == ["read", "write"]


async def test_create_api_key_unauthorized(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    # Call without Authorization header
    payload = {"name": "Test Token", "scopes": ["read"]}
    response = await client.post("/api/v1/api-keys", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "unauthenticated"


async def test_list_api_keys_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    user = await override_deps.register(
        email="list_keys@example.com",
        password="password",
        full_name="List Keys",
    )
    jwt_manager = JWTManager(secret=_TEST_SECRET)
    access_token = jwt_manager.create_access_token(user.id)

    # Create two keys
    await override_deps.create_api_key(user_id=user.id, name="Key 1", scopes=["read"])
    await override_deps.create_api_key(user_id=user.id, name="Key 2", scopes=["write"])

    headers = {"Authorization": f"Bearer {access_token}"}
    response = await client.get("/api/v1/api-keys", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["name"] == "Key 1"
    assert body[1]["name"] == "Key 2"


async def test_delete_api_key_success(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    user = await override_deps.register(
        email="delete_key@example.com",
        password="password",
        full_name="Delete Key User",
    )
    jwt_manager = JWTManager(secret=_TEST_SECRET)
    access_token = jwt_manager.create_access_token(user.id)

    _, key_entity = await override_deps.create_api_key(
        user_id=user.id, name="Temp Key", scopes=["read"]
    )

    headers = {"Authorization": f"Bearer {access_token}"}
    # Delete the key
    response = await client.delete(f"/api/v1/api-keys/{key_entity.id}", headers=headers)
    assert response.status_code == 204

    # Verify key is no longer in active keys list
    list_res = await client.get("/api/v1/api-keys", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0


async def test_authenticate_via_api_key_header(
    client: AsyncClient,
    override_deps: AuthService,
) -> None:
    user = await override_deps.register(
        email="apikey_header@example.com",
        password="password",
        full_name="API Key Header User",
    )
    plain_key, _ = await override_deps.create_api_key(
        user_id=user.id, name="SDK Token", scopes=["read"]
    )

    # Use the generated plain API key in the X-API-Key header to authenticate
    headers = {"X-API-Key": plain_key}
    response = await client.get("/api/v1/api-keys", headers=headers)
    assert response.status_code == 200
    body = response.json()
    # The API Key allows listing keys since it validates user context correctly
    assert len(body) == 1
    assert body[0]["name"] == "SDK Token"

