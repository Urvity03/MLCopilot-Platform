from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.features.auth.repository import (
    ApiKeyRepository,
    RefreshTokenRepository,
    UserRepository,
)
from mlcopilot.features.auth.service import AuthService
from mlcopilot.infrastructure.db.repositories import (
    SqlAlchemyApiKeyRepository,
    SqlAlchemyRefreshTokenRepository,
    SqlAlchemyUserRepository,
)
from mlcopilot.infrastructure.db.session import get_db_session
from mlcopilot.infrastructure.security.api_key import ApiKeyManager
from mlcopilot.infrastructure.security.jwt import JWTManager
from mlcopilot.infrastructure.security.password import PasswordHasher


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


async def get_auth_service(
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    refresh_token_repo: Annotated[
        RefreshTokenRepository, Depends(get_refresh_token_repository)
    ],
    api_key_repo: Annotated[ApiKeyRepository, Depends(get_api_key_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    """FastAPI dependency to resolve AuthService with all its collaborators."""
    return AuthService(
        user_repo=user_repo,
        refresh_token_repo=refresh_token_repo,
        api_key_repo=api_key_repo,
        password_hasher=PasswordHasher(),
        jwt_manager=JWTManager(secret=settings.jwt_secret.get_secret_value()),
        api_key_manager=ApiKeyManager(),
    )

