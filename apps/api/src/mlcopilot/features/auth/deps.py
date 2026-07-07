from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.features.auth.repository import (
    ApiKeyRepository,
    RefreshTokenRepository,
    UserRepository,
)
from mlcopilot.infrastructure.db.repositories import (
    SqlAlchemyApiKeyRepository,
    SqlAlchemyRefreshTokenRepository,
    SqlAlchemyUserRepository,
)
from mlcopilot.infrastructure.db.session import get_db_session


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserRepository:
    """FastAPI dependency to resolve UserRepository."""
    return SqlAlchemyUserRepository(session)


async def get_refresh_token_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> RefreshTokenRepository:
    """FastAPI dependency to resolve RefreshTokenRepository."""
    return SqlAlchemyRefreshTokenRepository(session)


async def get_api_key_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiKeyRepository:
    """FastAPI dependency to resolve ApiKeyRepository."""
    return SqlAlchemyApiKeyRepository(session)
