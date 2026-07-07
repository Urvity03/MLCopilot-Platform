from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.user import User as DomainUser
from mlcopilot.infrastructure.db.models import User as DbUser

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyUserRepository:
    """SQLAlchemy implementation of the UserRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_user: DbUser) -> DomainUser:
        return DomainUser(
            id=db_user.id,
            email=db_user.email,
            password_hash=db_user.password_hash,
            full_name=db_user.full_name,
            is_active=db_user.is_active,
            is_superuser=db_user.is_superuser,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
        )

    async def get_by_id(self, user_id: UUID) -> DomainUser | None:
        """Retrieve a user by ID."""
        db_user = await self._session.get(DbUser, user_id)
        if not db_user:
            return None
        return self._to_domain(db_user)

    async def get_by_email(self, email: str) -> DomainUser | None:
        """Retrieve a user by case-insensitive email."""
        result = await self._session.execute(select(DbUser).where(DbUser.email == email))
        db_user = result.scalar_one_or_none()
        if not db_user:
            return None
        return self._to_domain(db_user)

    async def add(self, user: DomainUser) -> None:
        """Save a new user."""
        db_user = DbUser(
            id=user.id,
            email=user.email,
            password_hash=user.password_hash,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        self._session.add(db_user)
        await self._session.flush()

    async def update(self, user: DomainUser) -> None:
        """Update an existing user."""
        db_user = await self._session.get(DbUser, user.id)
        if not db_user:
            msg = f"User with ID {user.id} not found"
            raise NotFoundError(msg)

        db_user.email = user.email
        db_user.password_hash = user.password_hash
        db_user.full_name = user.full_name
        db_user.is_active = user.is_active
        db_user.is_superuser = user.is_superuser
        db_user.updated_at = user.updated_at
        await self._session.flush()
