from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import delete, select

from mlcopilot.domain.oauth_account import OAuthAccount as DomainOAuthAccount
from mlcopilot.infrastructure.db.models import OAuthAccount as DbOAuthAccount

if TYPE_CHECKING:
    from uuid import UUID
    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyOAuthAccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db: DbOAuthAccount) -> DomainOAuthAccount:
        return DomainOAuthAccount(
            id=db.id,
            user_id=db.user_id,
            provider=db.provider,
            provider_account_id=db.provider_account_id,
            provider_email=db.provider_email,
            provider_name=db.provider_name,
            provider_avatar=db.provider_avatar,
            created_at=db.created_at,
        )

    async def get_by_provider_and_id(
        self, provider: str, provider_account_id: str,
    ) -> DomainOAuthAccount | None:
        result = await self._session.execute(
            select(DbOAuthAccount).where(
                DbOAuthAccount.provider == provider,
                DbOAuthAccount.provider_account_id == provider_account_id,
            )
        )
        db = result.scalar_one_or_none()
        return self._to_domain(db) if db else None

    async def get_by_user_id(self, user_id: UUID) -> list[DomainOAuthAccount]:
        result = await self._session.execute(
            select(DbOAuthAccount).where(DbOAuthAccount.user_id == user_id)
        )
        return [self._to_domain(db) for db in result.scalars().all()]

    async def add(self, account: DomainOAuthAccount) -> None:
        db = DbOAuthAccount(
            id=account.id,
            user_id=account.user_id,
            provider=account.provider,
            provider_account_id=account.provider_account_id,
            provider_email=account.provider_email,
            provider_name=account.provider_name,
            provider_avatar=account.provider_avatar,
            created_at=account.created_at,
        )
        self._session.add(db)
        await self._session.flush()

    async def delete_by_user_and_provider(self, user_id: UUID, provider: str) -> None:
        await self._session.execute(
            delete(DbOAuthAccount).where(
                DbOAuthAccount.user_id == user_id,
                DbOAuthAccount.provider == provider,
            )
        )
        await self._session.flush()
