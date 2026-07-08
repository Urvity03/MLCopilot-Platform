from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.errors import AuthenticationError
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


async def get_current_user(
    settings: Annotated[Settings, Depends(get_settings)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    api_key_repo: Annotated[ApiKeyRepository, Depends(get_api_key_repository)],
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> AuthContext:
    """FastAPI dependency to authenticate requests and retrieve the current AuthContext."""
    # 1. Bearer JWT
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        jwt_manager = JWTManager(secret=settings.jwt_secret.get_secret_value())
        payload = jwt_manager.decode_access_token(token)

        user = await user_repo.get_by_id(payload.sub)
        if not user:
            raise AuthenticationError("User not found", code="unauthenticated")
        if not user.is_active:
            raise AuthenticationError("User is inactive", code="unauthenticated")

        return AuthContext(user=user, via="jwt")

    # 2. API key header
    if x_api_key:
        key_hash = ApiKeyManager.hash_key(x_api_key)
        api_key = await api_key_repo.get_by_hash(key_hash)
        if not api_key:
            raise AuthenticationError("Invalid API key", code="unauthenticated")
        if api_key.revoked_at is not None:
            raise AuthenticationError("API key has been revoked", code="unauthenticated")

        user = await user_repo.get_by_id(api_key.user_id)
        if not user:
            raise AuthenticationError("User not found", code="unauthenticated")
        if not user.is_active:
            raise AuthenticationError("User is inactive", code="unauthenticated")

        return AuthContext(user=user, via="api_key", api_key_scopes=api_key.scopes)

    raise AuthenticationError("Not authenticated", code="unauthenticated")


