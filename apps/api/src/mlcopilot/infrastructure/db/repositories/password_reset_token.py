from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select

from mlcopilot.domain.password_reset_token import PasswordResetToken as DomainToken
from mlcopilot.infrastructure.db.models import PasswordResetToken as DbToken

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyPasswordResetTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db: DbToken) -> DomainToken:
        return DomainToken(
            id=db.id,
            user_id=db.user_id,
            token_hash=db.token_hash,
            expires_at=db.expires_at,
            used_at=db.used_at,
            created_at=db.created_at,
        )

    async def get_by_hash(self, token_hash: str) -> DomainToken | None:
        result = await self._session.execute(
            select(DbToken).where(DbToken.token_hash == token_hash)
        )
        db = result.scalar_one_or_none()
        return self._to_domain(db) if db else None

    async def add(self, token: DomainToken) -> None:
        db = DbToken(
            id=token.id,
            user_id=token.user_id,
            token_hash=token.token_hash,
            expires_at=token.expires_at,
            used_at=token.used_at,
            created_at=token.created_at,
        )
        self._session.add(db)
        await self._session.flush()

    async def mark_used(self, token_id: UUID) -> None:
        db = await self._session.get(DbToken, token_id)
        if db:
            db.used_at = datetime.now(UTC)
            await self._session.flush()
