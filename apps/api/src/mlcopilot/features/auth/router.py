"""Authentication endpoint handlers."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.domain.errors import AuthenticationError
from mlcopilot.features.auth.deps import get_auth_service
from mlcopilot.features.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from mlcopilot.features.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    """Securely set the refresh token HTTP-only cookie."""
    # The path limits cookie transmissions strictly to the authentication sub-routes.
    cookie_path = f"{settings.api_v1_prefix}/auth"
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path=cookie_path,
        # Refresh tokens are valid for 14 days per docs/architecture/09-authentication.md
        max_age=14 * 24 * 60 * 60,
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    """Clear the refresh token HTTP-only cookie."""
    cookie_path = f"{settings.api_v1_prefix}/auth"
    response.delete_cookie(key=_COOKIE_NAME, path=cookie_path)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserResponse:
    """Register a new user account."""
    user = await auth_service.register(
        email=str(payload.email),
        password=payload.password,
        full_name=payload.full_name,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    payload: LoginRequest,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Authenticate with credentials and issue access + refresh tokens."""
    access_token, refresh_token = await auth_service.login(
        email=str(payload.email),
        password=payload.password,
    )
    _set_refresh_cookie(response, refresh_token, settings)
    return TokenResponse(access_token=access_token)


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh(
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    refresh_token: Annotated[str | None, Cookie(alias=_COOKIE_NAME)] = None,
) -> TokenResponse:
    """Rotate a refresh token to mint a new access token."""
    if not refresh_token:
        raise AuthenticationError("Refresh token missing", code="unauthenticated")

    access_token, new_refresh_token = await auth_service.refresh(
        raw_refresh_token=refresh_token
    )
    _set_refresh_cookie(response, new_refresh_token, settings)
    return TokenResponse(access_token=access_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    refresh_token: Annotated[str | None, Cookie(alias=_COOKIE_NAME)] = None,
) -> None:
    """Log out a user by revoking the refresh token lineage and clearing the cookie."""
    if not refresh_token:
        raise AuthenticationError("Refresh token missing", code="unauthenticated")

    await auth_service.logout(raw_refresh_token=refresh_token)
    _clear_refresh_cookie(response, settings)



