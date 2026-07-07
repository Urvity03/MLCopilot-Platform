from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from mlcopilot.domain.api_key import ApiKey as DomainApiKey
from mlcopilot.domain.errors import NotFoundError
from mlcopilot.infrastructure.db.models import ApiKey as DbApiKey

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyApiKeyRepository:
    """SQLAlchemy implementation of the ApiKeyRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_key: DbApiKey) -> DomainApiKey:
        return DomainApiKey(
            id=db_key.id,
            user_id=db_key.user_id,
            name=db_key.name,
            prefix=db_key.prefix,
            key_hash=db_key.key_hash,
            scopes=db_key.scopes,
            revoked_at=db_key.revoked_at,
            last_used_at=db_key.last_used_at,
            created_at=db_key.created_at,
            updated_at=db_key.updated_at,
        )

    async def get_by_id(self, key_id: UUID) -> DomainApiKey | None:
        """Retrieve an API key by ID."""
        db_key = await self._session.get(DbApiKey, key_id)
        if not db_key:
            return None
        return self._to_domain(db_key)

    async def get_by_hash(self, key_hash: str) -> DomainApiKey | None:
        """Retrieve an API key by its SHA-256 hash."""
        result = await self._session.execute(select(DbApiKey).where(DbApiKey.key_hash == key_hash))
        db_key = result.scalar_one_or_none()
        if not db_key:
            return None
        return self._to_domain(db_key)

    async def list_active_for_user(self, user_id: UUID) -> list[DomainApiKey]:
        """List all active (unrevoked) API keys belonging to a user."""
        result = await self._session.execute(
            select(DbApiKey).where(
                DbApiKey.user_id == user_id,
                DbApiKey.revoked_at.is_(None),
            )
        )
        db_keys = result.scalars().all()
        return [self._to_domain(k) for k in db_keys]

    async def add(self, api_key: DomainApiKey) -> None:
        """Save a new API key."""
        db_key = DbApiKey(
            id=api_key.id,
            user_id=api_key.user_id,
            name=api_key.name,
            prefix=api_key.prefix,
            key_hash=api_key.key_hash,
            scopes=api_key.scopes,
            revoked_at=api_key.revoked_at,
            last_used_at=api_key.last_used_at,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at,
        )
        self._session.add(db_key)
        await self._session.flush()

    async def update(self, api_key: DomainApiKey) -> None:
        """Update an existing API key."""
        db_key = await self._session.get(DbApiKey, api_key.id)
        if not db_key:
            msg = f"ApiKey with ID {api_key.id} not found"
            raise NotFoundError(msg)

        db_key.name = api_key.name
        db_key.revoked_at = api_key.revoked_at
        db_key.last_used_at = api_key.last_used_at
        db_key.updated_at = api_key.updated_at
        await self._session.flush()
