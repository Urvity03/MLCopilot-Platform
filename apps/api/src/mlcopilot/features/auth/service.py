"""Authentication service — use-case orchestration.

Implements registration, login, token refresh, logout, API key creation,
password reset, and OAuth user account linking.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from mlcopilot.domain.api_key import ApiKey
from mlcopilot.domain.errors import AuthenticationError, ConflictError
from mlcopilot.domain.oauth_account import OAuthAccount
from mlcopilot.domain.password_reset_token import PasswordResetToken
from mlcopilot.domain.refresh_token import RefreshToken
from mlcopilot.domain.user import User

if TYPE_CHECKING:
    from mlcopilot.features.auth.repository import (
        ApiKeyRepository,
        OAuthAccountRepository,
        PasswordResetTokenRepository,
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
        oauth_repo: OAuthAccountRepository | None = None,
        password_reset_repo: PasswordResetTokenRepository | None = None,
    ) -> None:
        self._users = user_repo
        self._refresh_tokens = refresh_token_repo
        self._api_keys = api_key_repo
        self._passwords = password_hasher
        self._jwt = jwt_manager
        self._api_key_mgr = api_key_manager
        self._oauth = oauth_repo
        self._password_resets = password_reset_repo

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
        user enumeration by latency.

        Raises:
            AuthenticationError: on bad credentials or deactivated account.
        """
        user = await self._users.get_by_email(email)

        if user is None:
            self._passwords.verify("dummy", self._dummy_hash)
            raise AuthenticationError("Invalid email or password", code="unauthenticated")

        if user.password_hash is None:
            # User registered with OAuth and has no password set
            self._passwords.verify("dummy", self._dummy_hash)
            raise AuthenticationError(
                "Account created via OAuth. Please sign in with Google or GitHub.",
                code="oauth_only_user",
            )

        if not self._passwords.verify(password, user.password_hash):
            raise AuthenticationError("Invalid email or password", code="unauthenticated")

        if not user.is_active:
            raise AuthenticationError("Account is deactivated", code="unauthenticated")

        now = datetime.now(UTC)
        user.last_login = now
        user.updated_at = now
        await self._users.update(user)

        access_token = self._jwt.create_access_token(user.id)
        raw_refresh, refresh_entity = self._create_refresh_token(user.id)
        await self._refresh_tokens.add(refresh_entity)

        return access_token, raw_refresh

    # ── Password Reset ────────────────────────────────────────────────

    async def request_password_reset(self, *, email: str) -> str | None:
        """Generate a password reset token for email.

        Returns raw_token string if user exists, else None.
        """
        if self._password_resets is None:
            return None

        user = await self._users.get_by_email(email)
        if user is None:
            return None

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        now = datetime.now(UTC)

        entity = PasswordResetToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=1),
            used_at=None,
            created_at=now,
        )
        await self._password_resets.add(entity)
        return raw_token

    async def reset_password(self, *, raw_token: str, new_password: str) -> None:
        """Reset user password using token."""
        if self._password_resets is None:
            raise AuthenticationError("Password reset is disabled", code="unauthenticated")

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        stored = await self._password_resets.get_by_hash(token_hash)

        if stored is None:
            raise AuthenticationError("Invalid reset token", code="unauthenticated")
        if stored.used_at is not None:
            raise AuthenticationError("Reset token already used", code="unauthenticated")
        if stored.expires_at < datetime.now(UTC):
            raise AuthenticationError("Reset token has expired", code="token_expired")

        user = await self._users.get_by_id(stored.user_id)
        if user is None:
            raise AuthenticationError("User not found", code="unauthenticated")

        now = datetime.now(UTC)
        user.password_hash = self._passwords.hash(new_password)
        user.updated_at = now
        await self._users.update(user)
        await self._password_resets.mark_used(stored.id)

    # ── OAuth Account Linking ─────────────────────────────────────────

    async def find_or_create_oauth_user(
        self,
        *,
        email: str,
        full_name: str,
        avatar_url: str | None,
        provider: str,
        provider_account_id: str,
    ) -> User:
        """Find user by email or create new. Link OAuth account. Account Linking pattern."""
        now = datetime.now(UTC)

        # DB OP 1: get_by_email
        try:
            print("DB OP 1: executing users.get_by_email...", flush=True)
            existing = await self._users.get_by_email(email)
            print(f"DB OP 1 OK: existing={existing}", flush=True)
        except Exception:
            logger.exception("DB OP 1 FAILED: users.get_by_email")
            print("DB OP 1 FAILED: users.get_by_email", flush=True)
            raise

        if existing is not None:
            existing.avatar_url = avatar_url or existing.avatar_url
            existing.last_login = now
            existing.updated_at = now

            # DB OP 2: users.update
            try:
                print("DB OP 2: executing users.update...", flush=True)
                await self._users.update(existing)
                print("DB OP 2 OK", flush=True)
            except Exception:
                logger.exception("DB OP 2 FAILED: users.update")
                print("DB OP 2 FAILED: users.update", flush=True)
                raise

            if self._oauth is not None:
                # DB OP 3: oauth.get_by_provider_and_id
                try:
                    print("DB OP 3: executing oauth.get_by_provider_and_id...", flush=True)
                    linked = await self._oauth.get_by_provider_and_id(provider, provider_account_id)
                    print(f"DB OP 3 OK: linked={linked}", flush=True)
                except Exception:
                    logger.exception("DB OP 3 FAILED: oauth.get_by_provider_and_id")
                    print("DB OP 3 FAILED: oauth.get_by_provider_and_id", flush=True)
                    raise

                if linked is None:
                    oauth_account = OAuthAccount(
                        id=uuid.uuid4(),
                        user_id=existing.id,
                        provider=provider,
                        provider_account_id=provider_account_id,
                        provider_email=email,
                        provider_name=full_name,
                        provider_avatar=avatar_url,
                        created_at=now,
                    )
                    # DB OP 4: oauth.add
                    try:
                        print("DB OP 4: executing oauth.add...", flush=True)
                        await self._oauth.add(oauth_account)
                        print("DB OP 4 OK", flush=True)
                    except Exception:
                        logger.exception("DB OP 4 FAILED: oauth.add")
                        print("DB OP 4 FAILED: oauth.add", flush=True)
                        raise

            return existing

        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=None,
            full_name=full_name,
            is_active=True,
            is_superuser=False,
            created_at=now,
            updated_at=now,
            avatar_url=avatar_url,
            last_login=now,
        )

        # DB OP 5: users.add
        try:
            print("DB OP 5: executing users.add...", flush=True)
            await self._users.add(user)
            print("DB OP 5 OK", flush=True)
        except Exception:
            logger.exception("DB OP 5 FAILED: users.add")
            print("DB OP 5 FAILED: users.add", flush=True)
            raise

        if self._oauth is not None:
            oauth_account = OAuthAccount(
                id=uuid.uuid4(),
                user_id=user.id,
                provider=provider,
                provider_account_id=provider_account_id,
                provider_email=email,
                provider_name=full_name,
                provider_avatar=avatar_url,
                created_at=now,
            )

            # DB OP 6: oauth.add for new user
            try:
                print("DB OP 6: executing oauth.add for new user...", flush=True)
                await self._oauth.add(oauth_account)
                print("DB OP 6 OK", flush=True)
            except Exception:
                logger.exception("DB OP 6 FAILED: oauth.add for new user")
                print("DB OP 6 FAILED: oauth.add for new user", flush=True)
                raise

        return user

    # ── OAuth Account Management ─────────────────────────────────────

    async def list_oauth_accounts(self, user_id: uuid.UUID) -> list[OAuthAccount]:
        """List linked OAuth provider accounts for user."""
        if self._oauth is None:
            return []
        return await self._oauth.get_by_user_id(user_id)

    async def disconnect_oauth_account(self, user_id: uuid.UUID, provider: str) -> None:
        """Disconnect an OAuth provider account."""
        if self._oauth is not None:
            await self._oauth.delete_by_user_and_provider(user_id, provider)

    # ── Token refresh ─────────────────────────────────────────────────

    async def refresh(self, *, raw_refresh_token: str) -> tuple[str, str]:
        """Rotate a refresh token."""
        token_hash = self._hash_refresh_token(raw_refresh_token)
        stored = await self._refresh_tokens.get_by_hash(token_hash)

        if stored is None:
            raise AuthenticationError("Invalid refresh token", code="unauthenticated")

        if stored.revoked_at is not None:
            await self._refresh_tokens.revoke_family(stored.family_id)
            raise AuthenticationError(
                "Refresh token reuse detected; family revoked",
                code="token_reuse_detected",
            )

        if stored.expires_at < datetime.now(UTC):
            raise AuthenticationError("Refresh token has expired", code="token_expired")

        stored.revoked_at = datetime.now(UTC)
        await self._refresh_tokens.update(stored)

        access_token = self._jwt.create_access_token(stored.user_id)
        raw_new, new_entity = self._create_refresh_token(
            stored.user_id, family_id=stored.family_id,
        )
        await self._refresh_tokens.add(new_entity)

        return access_token, raw_new

    # ── Logout ────────────────────────────────────────────────────────

    async def logout(self, *, raw_refresh_token: str) -> None:
        """Revoke the presented token's entire rotation family."""
        token_hash = self._hash_refresh_token(raw_refresh_token)
        stored = await self._refresh_tokens.get_by_hash(token_hash)

        if stored is None:
            raise AuthenticationError("Invalid refresh token", code="unauthenticated")

        await self._refresh_tokens.revoke_family(stored.family_id)

    # ── API keys ──────────────────────────────────────────────────────

    async def create_api_key(
        self,
        *,
        user_id: uuid.UUID,
        name: str,
        scopes: list[str],
    ) -> tuple[str, ApiKey]:
        """Create a new API key."""
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

    async def list_api_keys(self, *, user_id: uuid.UUID) -> list[ApiKey]:
        """List all active API keys for user."""
        return await self._api_keys.list_active_for_user(user_id)

    async def revoke_api_key(self, *, key_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Revoke an API key."""
        from mlcopilot.domain.errors import NotFoundError

        key = await self._api_keys.get_by_id(key_id)
        if key is None or key.user_id != user_id:
            raise NotFoundError("API key not found")

        key.revoked_at = datetime.now(UTC)
        await self._api_keys.update(key)

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
