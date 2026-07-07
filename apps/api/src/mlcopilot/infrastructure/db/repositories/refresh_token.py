from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select, update

from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.refresh_token import RefreshToken as DomainRefreshToken
from mlcopilot.infrastructure.db.models import RefreshToken as DbRefreshToken

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyRefreshTokenRepository:
    """SQLAlchemy implementation of the RefreshTokenRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_token: DbRefreshToken) -> DomainRefreshToken:
        return DomainRefreshToken(
            id=db_token.id,
            user_id=db_token.user_id,
            family_id=db_token.family_id,
            token_hash=db_token.token_hash,
            expires_at=db_token.expires_at,
            revoked_at=db_token.revoked_at,
            created_at=db_token.created_at,
            updated_at=db_token.updated_at,
        )

    async def get_by_id(self, token_id: UUID) -> DomainRefreshToken | None:
        """Retrieve a refresh token by ID."""
        db_token = await self._session.get(DbRefreshToken, token_id)
        if not db_token:
            return None
        return self._to_domain(db_token)

    async def get_by_hash(self, token_hash: str) -> DomainRefreshToken | None:
        """Retrieve a refresh token by its hashed value."""
        result = await self._session.execute(
            select(DbRefreshToken).where(DbRefreshToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()
        if not db_token:
            return None
        return self._to_domain(db_token)

    async def list_active_by_family(self, family_id: UUID) -> list[DomainRefreshToken]:
        """List all unexpired, unrevoked tokens belonging to a rotation family."""
        now_utc = datetime.now(UTC)
        result = await self._session.execute(
            select(DbRefreshToken).where(
                DbRefreshToken.family_id == family_id,
                DbRefreshToken.revoked_at.is_(None),
                DbRefreshToken.expires_at > now_utc,
            )
        )
        db_tokens = result.scalars().all()
        return [self._to_domain(t) for t in db_tokens]

    async def add(self, token: DomainRefreshToken) -> None:
        """Save a new refresh token."""
        db_token = DbRefreshToken(
            id=token.id,
            user_id=token.user_id,
            family_id=token.family_id,
            token_hash=token.token_hash,
            expires_at=token.expires_at,
            revoked_at=token.revoked_at,
            created_at=token.created_at,
            updated_at=token.updated_at,
        )
        self._session.add(db_token)
        await self._session.flush()

    async def update(self, token: DomainRefreshToken) -> None:
        """Update an existing refresh token."""
        db_token = await self._session.get(DbRefreshToken, token.id)
        if not db_token:
            msg = f"RefreshToken with ID {token.id} not found"
            raise NotFoundError(msg)

        db_token.revoked_at = token.revoked_at
        db_token.expires_at = token.expires_at
        db_token.updated_at = token.updated_at
        await self._session.flush()

    async def revoke_family(self, family_id: UUID) -> None:
        """Revoke all active tokens in a family."""
        now_utc = datetime.now(UTC)
        await self._session.execute(
            update(DbRefreshToken)
            .where(
                DbRefreshToken.family_id == family_id,
                DbRefreshToken.revoked_at.is_(None),
            )
            .values(
                revoked_at=now_utc,
                updated_at=now_utc,
            )
        )
        await self._session.flush()
