"""Authentication service — use-case orchestration.

Implements registration, login, token refresh, logout, and API key creation
per docs/architecture/09-authentication.md.  Depends on repository protocols
for persistence and concrete security components for cryptography.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from mlcopilot.domain.api_key import ApiKey
from mlcopilot.domain.errors import AuthenticationError, ConflictError
from mlcopilot.domain.refresh_token import RefreshToken
from mlcopilot.domain.user import User

if TYPE_CHECKING:
    from mlcopilot.features.auth.repository import (
        ApiKeyRepository,
        RefreshTokenRepository,
        UserRepository,
    )
    from mlcopilot.infrastructure.security.api_key import ApiKeyManager
    from mlcopilot.infrastructure.security.jwt import JWTManager
    from mlcopilot.infrastructure.security.password import PasswordHasher

_REFRESH_TOKEN_EXPIRE_DAYS = 14


class AuthService:
    """Orchestrates authentication use cases."""

    def __init__(
        self,
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository,
        api_key_repo: ApiKeyRepository,
        password_hasher: PasswordHasher,
        jwt_manager: JWTManager,
        api_key_manager: ApiKeyManager,
    ) -> None:
        self._users = user_repo
        self._refresh_tokens = refresh_token_repo
        self._api_keys = api_key_repo
        self._passwords = password_hasher
        self._jwt = jwt_manager
        self._api_key_mgr = api_key_manager

        # Pre-compute a dummy hash so timing-safe login always runs a verify.
        self._dummy_hash = password_hasher.hash("dummy-timing-safe")

    # ── Registration ──────────────────────────────────────────────────

    async def register(
        self,
        *,
        email: str,
        password: str,
        full_name: str,
    ) -> User:
        """Create a new user account.

        Raises:
            ConflictError: if a user with *email* already exists.
        """
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise ConflictError("A user with this email already exists")

        now = datetime.now(UTC)
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=self._passwords.hash(password),
            full_name=full_name,
            is_active=True,
            is_superuser=False,
            created_at=now,
            updated_at=now,
        )
        await self._users.add(user)
        return user

    # ── Login ─────────────────────────────────────────────────────────

    async def login(
        self,
        *,
        email: str,
        password: str,
    ) -> tuple[str, str]:
        """Authenticate and return ``(access_token, raw_refresh_token)``.

        Timing-safe: a dummy verify runs even for unknown emails to prevent
        user enumeration by latency (doc 09).

        Raises:
            AuthenticationError: on bad credentials or deactivated account.
        """
        user = await self._users.get_by_email(email)

        if user is None:
            # Consume the same time as a real verify to prevent timing attacks.
            self._passwords.verify("dummy", self._dummy_hash)
            raise AuthenticationError("Invalid email or password")

        if not self._passwords.verify(password, user.password_hash):
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("Account is deactivated")

        access_token = self._jwt.create_access_token(user.id)
        raw_refresh, refresh_entity = self._create_refresh_token(user.id)
        await self._refresh_tokens.add(refresh_entity)

        return access_token, raw_refresh

    # ── Token refresh ─────────────────────────────────────────────────

    async def refresh(self, *, raw_refresh_token: str) -> tuple[str, str]:
        """Rotate a refresh token.

        Returns ``(new_access_token, new_raw_refresh_token)``.

        Stolen-token detection: reuse of an already-rotated token revokes the
        entire family (doc 09).

        Raises:
            AuthenticationError: on invalid, expired, or reused token.
        """
        token_hash = self._hash_refresh_token(raw_refresh_token)
        stored = await self._refresh_tokens.get_by_hash(token_hash)

        if stored is None:
            raise AuthenticationError("Invalid refresh token")

        # Stolen-token detection: already revoked ⇒ reuse attack.
        if stored.revoked_at is not None:
            await self._refresh_tokens.revoke_family(stored.family_id)
            raise AuthenticationError(
                "Refresh token reuse detected; family revoked"
            )

        if stored.expires_at < datetime.now(UTC):
            raise AuthenticationError("Refresh token has expired")

        # Revoke the consumed token.
        stored.revoked_at = datetime.now(UTC)
        await self._refresh_tokens.update(stored)

        # Issue a new pair in the same family.
        access_token = self._jwt.create_access_token(stored.user_id)
        raw_new, new_entity = self._create_refresh_token(
            stored.user_id, family_id=stored.family_id,
        )
        await self._refresh_tokens.add(new_entity)

        return access_token, raw_new

    # ── Logout ────────────────────────────────────────────────────────

    async def logout(self, *, raw_refresh_token: str) -> None:
        """Revoke the presented token's entire rotation family.

        Raises:
            AuthenticationError: if the token is unknown.
        """
        token_hash = self._hash_refresh_token(raw_refresh_token)
        stored = await self._refresh_tokens.get_by_hash(token_hash)

        if stored is None:
            raise AuthenticationError("Invalid refresh token")

        await self._refresh_tokens.revoke_family(stored.family_id)

    # ── API keys ──────────────────────────────────────────────────────

    async def create_api_key(
        self,
        *,
        user_id: uuid.UUID,
        name: str,
        scopes: list[str],
    ) -> tuple[str, ApiKey]:
        """Create a new API key.

        Returns ``(full_key_shown_once, api_key_entity)``.
        """
        full_key, prefix, key_hash = self._api_key_mgr.generate()
        now = datetime.now(UTC)

        api_key = ApiKey(
            id=uuid.uuid4(),
            user_id=user_id,
            name=name,
            prefix=prefix,
            key_hash=key_hash,
            scopes=scopes,
            revoked_at=None,
            last_used_at=None,
            created_at=now,
            updated_at=now,
        )
        await self._api_keys.add(api_key)
        return full_key, api_key

    # ── Internal helpers ──────────────────────────────────────────────

    def _create_refresh_token(
        self,
        user_id: uuid.UUID,
        *,
        family_id: uuid.UUID | None = None,
    ) -> tuple[str, RefreshToken]:
        """Generate a raw refresh token string and the corresponding entity."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_refresh_token(raw_token)
        now = datetime.now(UTC)

        entity = RefreshToken(
            id=uuid.uuid4(),
            user_id=user_id,
            family_id=family_id or uuid.uuid4(),
            token_hash=token_hash,
            expires_at=now + timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS),
            revoked_at=None,
            created_at=now,
            updated_at=now,
        )
        return raw_token, entity

    @staticmethod
    def _hash_refresh_token(raw_token: str) -> str:
        """SHA-256 hex digest of a raw refresh token."""
        return hashlib.sha256(raw_token.encode()).hexdigest()
