"""Authentication endpoint handlers."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status
from fastapi.responses import RedirectResponse

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.errors import AuthenticationError
from mlcopilot.features.auth.deps import get_auth_service, get_current_user, get_oauth_service
from mlcopilot.features.auth.oauth_service import OAuthService
from mlcopilot.features.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    OAuthAccountResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from mlcopilot.features.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(
    response: Response, token: str, settings: Settings, remember_me: bool = True
) -> None:
    """Securely set the refresh token HTTP-only cookie."""
    cookie_path = f"{settings.api_v1_prefix}/auth"
    kwargs = {
        "key": _COOKIE_NAME,
        "value": token,
        "httponly": True,
        "secure": settings.environment == "production",
        "samesite": "lax",
        "path": cookie_path,
    }
    if remember_me:
        # Refresh tokens are valid for 14 days
        kwargs["max_age"] = 14 * 24 * 60 * 60

    response.set_cookie(**kwargs)
    from mlcopilot.core.logging import get_logger
    logger = get_logger("mlcopilot.features.auth.router")
    logger.info("cookie.set_refresh_cookie", key=_COOKIE_NAME, path=cookie_path, max_age=kwargs.get("max_age"))


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
        avatar_url=user.avatar_url,
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
    _set_refresh_cookie(response, refresh_token, settings, remember_me=payload.remember_me)
    return TokenResponse(access_token=access_token)


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    auth_context: Annotated[AuthContext, Depends(get_current_user)],
) -> UserResponse:
    """Return authenticated user details."""
    u = auth_context.user
    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        is_superuser=u.is_superuser,
        created_at=u.created_at,
        updated_at=u.updated_at,
        avatar_url=u.avatar_url,
    )


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


# ── OAuth Routes ──────────────────────────────────────────────────────


@router.get("/oauth/google")
async def oauth_google_redirect(
    oauth_service: Annotated[OAuthService, Depends(get_oauth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """Redirect user to Google OAuth 2.0 consent screen."""
    try:
        url = oauth_service.get_google_auth_url()
        return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    except AuthenticationError:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=oauth_not_configured",
            status_code=status.HTTP_302_FOUND,
        )


@router.get("/oauth/google/callback")
async def oauth_google_callback(
    code: str,
    state: str,
    oauth_service: Annotated[OAuthService, Depends(get_oauth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """Google OAuth callback handler."""
    import urllib.parse
    from mlcopilot.core.logging import get_logger
    logger = get_logger("mlcopilot.features.auth.router")

    try:
        access_token, refresh_token = await oauth_service.handle_google_callback(code, state)
        redirect_url = f"{settings.frontend_url}/auth/callback"
        resp = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
        _set_refresh_cookie(resp, refresh_token, settings, remember_me=True)
        return resp
    except Exception as e:
        logger.error("oauth.google.callback_error", error=str(e))
        error_msg = str(e) or "Google OAuth authentication failed"
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={urllib.parse.quote(error_msg)}",
            status_code=status.HTTP_302_FOUND,
        )


@router.get("/oauth/github")
async def oauth_github_redirect(
    oauth_service: Annotated[OAuthService, Depends(get_oauth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """Redirect user to GitHub OAuth consent screen."""
    try:
        url = oauth_service.get_github_auth_url()
        return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    except AuthenticationError:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=oauth_not_configured",
            status_code=status.HTTP_302_FOUND,
        )


@router.get("/oauth/github/callback")
async def oauth_github_callback(
    code: str,
    state: str,
    oauth_service: Annotated[OAuthService, Depends(get_oauth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """GitHub OAuth callback handler."""
    import urllib.parse
    from mlcopilot.core.logging import get_logger
    logger = get_logger("mlcopilot.features.auth.router")

    try:
        access_token, refresh_token = await oauth_service.handle_github_callback(code, state)
        redirect_url = f"{settings.frontend_url}/auth/callback"
        resp = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
        _set_refresh_cookie(resp, refresh_token, settings, remember_me=True)
        return resp
    except Exception as e:
        logger.error("oauth.github.callback_error", error=str(e))
        error_msg = str(e) or "GitHub OAuth authentication failed"
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={urllib.parse.quote(error_msg)}",
            status_code=status.HTTP_302_FOUND,
        )


# ── Password Reset Routes ─────────────────────────────────────────────


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ForgotPasswordResponse:
    """Request a password reset link for an email address."""
    raw_token = await auth_service.request_password_reset(email=str(payload.email))
    reset_link = None
    if raw_token and settings.environment in ("development", "test"):
        reset_link = f"{settings.frontend_url}/reset-password?token={raw_token}"
    return ForgotPasswordResponse(
        message="If an account with that email exists, a password reset link has been sent.",
        reset_link=reset_link,
    )


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    payload: ResetPasswordRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> None:
    """Reset password using a reset token."""
    await auth_service.reset_password(
        raw_token=payload.token, new_password=payload.new_password
    )


# ── Connected OAuth Accounts Management ───────────────────────────────


@router.get("/oauth/accounts", response_model=list[OAuthAccountResponse])
async def list_connected_oauth_accounts(
    auth_context: Annotated[AuthContext, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> list[OAuthAccountResponse]:
    """List linked OAuth provider accounts for the current user."""
    accounts = await auth_service.list_oauth_accounts(auth_context.user.id)
    return [
        OAuthAccountResponse(
            id=acc.id,
            provider=acc.provider,
            provider_email=acc.provider_email,
            provider_name=acc.provider_name,
            provider_avatar=acc.provider_avatar,
            created_at=acc.created_at,
        )
        for acc in accounts
    ]


@router.delete("/oauth/accounts/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_oauth_account(
    provider: str,
    auth_context: Annotated[AuthContext, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> None:
    """Disconnect an OAuth provider account."""
    await auth_service.disconnect_oauth_account(auth_context.user.id, provider)

