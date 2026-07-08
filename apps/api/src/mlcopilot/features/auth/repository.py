from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from uuid import UUID

    from mlcopilot.domain.api_key import ApiKey
    from mlcopilot.domain.refresh_token import RefreshToken
    from mlcopilot.domain.user import User


class UserRepository(Protocol):
    """Protocol for user persistence operations."""

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Retrieve a user by ID."""
        ...

    async def get_by_email(self, email: str) -> User | None:
        """Retrieve a user by case-insensitive email."""
        ...

    async def add(self, user: User) -> None:
        """Save a new user."""
        ...

    async def update(self, user: User) -> None:
        """Update an existing user."""
        ...


class RefreshTokenRepository(Protocol):
    """Protocol for refresh token persistence operations."""

    async def get_by_id(self, token_id: UUID) -> RefreshToken | None:
        """Retrieve a refresh token by ID."""
        ...

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Retrieve a refresh token by its hashed value."""
        ...

    async def list_active_by_family(self, family_id: UUID) -> list[RefreshToken]:
        """List all unexpired, unrevoked tokens belonging to a rotation family."""
        ...

    async def add(self, token: RefreshToken) -> None:
        """Save a new refresh token."""
        ...

    async def update(self, token: RefreshToken) -> None:
        """Update an existing refresh token."""
        ...

    async def revoke_family(self, family_id: UUID) -> None:
        """Revoke all tokens in a family."""
        ...


class ApiKeyRepository(Protocol):
    """Protocol for API key persistence operations."""

    async def get_by_id(self, key_id: UUID) -> ApiKey | None:
        """Retrieve an API key by ID."""
        ...

    async def get_by_hash(self, key_hash: str) -> ApiKey | None:
        """Retrieve an API key by its SHA-256 hash."""
        ...

    async def list_active_for_user(self, user_id: UUID) -> list[ApiKey]:
        """List all active (unrevoked) API keys belonging to a user."""
        ...

    async def add(self, api_key: ApiKey) -> None:
        """Save a new API key."""
        ...

    async def update(self, api_key: ApiKey) -> None:
        """Update an existing API key."""
        ...
