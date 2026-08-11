"""OAuth service for Google 2.0 and GitHub OAuth integration."""

from __future__ import annotations

import base64
import hashlib
import secrets
import urllib.parse
import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import httpx
import jwt

from mlcopilot.core.logging import get_logger
from mlcopilot.domain.errors import AuthenticationError

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings
    from mlcopilot.features.auth.service import AuthService
    from mlcopilot.infrastructure.security.jwt import JWTManager

logger = get_logger("mlcopilot.features.auth.oauth_service")


class OAuthService:
    """Handles OAuth authorization flows for Google and GitHub."""

    def __init__(
        self,
        settings: Settings,
        auth_service: AuthService,
        jwt_manager: JWTManager,
    ) -> None:
        self._settings = settings
        self._auth_service = auth_service
        self._jwt = jwt_manager
        self._secret = settings.jwt_secret.get_secret_value()

    def _create_state_token(self, extra: dict[str, str] | None = None) -> str:
        now = datetime.now(UTC)
        payload: dict[str, object] = {
            "sub": "oauth_state",
            "exp": now + timedelta(minutes=10),
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": "oauth_state",
        }
        if extra:
            payload.update(extra)
        return jwt.encode(payload, self._secret, algorithm="HS256")

    def _verify_state_token(self, state: str) -> dict[str, object]:
        try:
            payload: dict[str, object] = jwt.decode(
                state, self._secret, algorithms=["HS256"]
            )
            if payload.get("type") != "oauth_state":
                raise AuthenticationError("Invalid state token type", code="unauthenticated")
            return payload
        except jwt.PyJWTError as e:
            logger.error("oauth.state_verification_failed", error=str(e), state=state)
            raise AuthenticationError("Invalid or expired OAuth state token", code="unauthenticated") from e

    # ── Google OAuth ──────────────────────────────────────────────────

    def get_google_auth_url(self) -> str:
        """Generate Google OAuth 2.0 authorization URL with PKCE."""
        client_id = self._settings.google_client_id.strip()
        if not client_id or "your_" in client_id.lower() or "placeholder" in client_id.lower():
            logger.error("oauth.google.unconfigured_client_id", client_id=client_id)
            raise AuthenticationError(
                "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
                code="oauth_not_configured",
            )

        code_verifier = secrets.token_urlsafe(64)
        code_challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest())
            .decode()
            .rstrip("=")
        )
        state = self._create_state_token(
            {"provider": "google", "code_verifier": code_verifier}
        )

        redirect_uri = f"{self._settings.oauth_redirect_base}{self._settings.api_v1_prefix}/auth/oauth/google/callback"
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",
            "prompt": "select_account",
        }
        url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        logger.info("oauth.google.redirect_generated", client_id=client_id, redirect_uri=redirect_uri)
        return url

    async def handle_google_callback(self, code: str, state: str) -> tuple[str, str]:
        """Exchange Google authorization code for tokens and link/create user."""
        logger.info("oauth.google.callback_started", code_length=len(code))
        state_payload = self._verify_state_token(state)
        code_verifier = str(state_payload.get("code_verifier", ""))

        if not code:
            raise AuthenticationError("Missing authorization code", code="oauth_failed")

        redirect_uri = f"{self._settings.oauth_redirect_base}{self._settings.api_v1_prefix}/auth/oauth/google/callback"
        client_secret = self._settings.google_client_secret.get_secret_value()

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": self._settings.google_client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                    "code_verifier": code_verifier,
                },
            )
            logger.info("oauth.google.token_exchange_status", status=token_resp.status_code)
            if token_resp.status_code != 200:
                logger.error(
                    "oauth.google.token_exchange_failed",
                    status=token_resp.status_code,
                    body=token_resp.text,
                )
                raise AuthenticationError(
                    f"Google token exchange failed ({token_resp.status_code}): {token_resp.text}",
                    code="oauth_failed",
                )

            token_data = token_resp.json()
            google_access_token = token_data.get("access_token")

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
            if userinfo_resp.status_code != 200:
                logger.error(
                    "oauth.google.user_profile_failed",
                    status=userinfo_resp.status_code,
                    body=userinfo_resp.text,
                )
                raise AuthenticationError(
                    f"Failed to fetch Google user profile ({userinfo_resp.status_code})",
                    code="oauth_failed",
                )

            info = userinfo_resp.json()
            email = info.get("email")
            provider_account_id = info.get("id")
            full_name = info.get("name") or (email.split("@")[0] if email else "Google User")
            avatar_url = info.get("picture")

            if not email or not provider_account_id:
                raise AuthenticationError("Invalid Google profile response: missing email or id", code="oauth_failed")

        user = await self._auth_service.find_or_create_oauth_user(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            provider="google",
            provider_account_id=str(provider_account_id),
        )

        access_token = self._jwt.create_access_token(user.id)
        raw_refresh, refresh_entity = self._auth_service._create_refresh_token(user.id)
        await self._auth_service._refresh_tokens.add(refresh_entity)

        logger.info("oauth.google.callback_success", user_id=str(user.id), email=user.email)
        return access_token, raw_refresh

    # ── GitHub OAuth ──────────────────────────────────────────────────

    def get_github_auth_url(self) -> str:
        """Generate GitHub OAuth authorization URL."""
        client_id = self._settings.github_client_id.strip()
        if not client_id or "your_" in client_id.lower() or "placeholder" in client_id.lower():
            logger.error("oauth.github.unconfigured_client_id", client_id=client_id)
            raise AuthenticationError(
                "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.",
                code="oauth_not_configured",
            )

        state = self._create_state_token({"provider": "github"})
        redirect_uri = f"{self._settings.oauth_redirect_base}{self._settings.api_v1_prefix}/auth/oauth/github/callback"
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "read:user user:email",
        }
        url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
        logger.info("oauth.github.redirect_generated", client_id=client_id, redirect_uri=redirect_uri)
        return url

    async def handle_github_callback(self, code: str, state: str) -> tuple[str, str]:
        """Exchange GitHub authorization code for tokens and link/create user."""
        logger.info("oauth.github.callback_started", code_length=len(code), state=state[:20])
        self._verify_state_token(state)
        redirect_uri = f"{self._settings.oauth_redirect_base}{self._settings.api_v1_prefix}/auth/oauth/github/callback"
        client_secret = self._settings.github_client_secret.get_secret_value()

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": self._settings.github_client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            logger.info("oauth.github.token_exchange_status", status=token_resp.status_code)
            if token_resp.status_code != 200:
                logger.error(
                    "oauth.github.token_exchange_failed",
                    status=token_resp.status_code,
                    body=token_resp.text,
                )
                raise AuthenticationError(f"GitHub token exchange failed ({token_resp.status_code}): {token_resp.text}", code="oauth_failed")

            token_data = token_resp.json()
            github_access_token = token_data.get("access_token")
            if not github_access_token:
                err_desc = token_data.get("error_description") or token_data.get("error") or "missing access_token"
                logger.error("oauth.github.missing_access_token", response_data=token_data)
                raise AuthenticationError(f"GitHub OAuth error: {err_desc}", code="oauth_failed")

            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {github_access_token}",
                    "Accept": "application/json",
                    "User-Agent": "MLCopilot-App",
                },
            )
            logger.info("oauth.github.user_profile_status", status=user_resp.status_code)
            if user_resp.status_code != 200:
                logger.error(
                    "oauth.github.user_profile_failed",
                    status=user_resp.status_code,
                    body=user_resp.text,
                )
                raise AuthenticationError(f"Failed to fetch GitHub profile ({user_resp.status_code})", code="oauth_failed")

            info = user_resp.json()
            provider_account_id = str(info.get("id"))
            email = info.get("email")
            full_name = info.get("name") or info.get("login") or f"GitHub User {provider_account_id}"
            avatar_url = info.get("avatar_url")

            if not email:
                logger.info("oauth.github.fetching_emails_fallback")
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {github_access_token}",
                        "Accept": "application/json",
                        "User-Agent": "MLCopilot-App",
                    },
                )
                if emails_resp.status_code == 200:
                    for e in emails_resp.json():
                        if e.get("primary") and e.get("verified"):
                            email = e.get("email")
                            break
                        if not email and e.get("verified"):
                            email = e.get("email")

            logger.info("oauth.github.profile_fetched", email=email, provider_account_id=provider_account_id)

            if not email:
                raise AuthenticationError("Could not obtain verified email from GitHub account", code="oauth_failed")

        user = await self._auth_service.find_or_create_oauth_user(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            provider="github",
            provider_account_id=provider_account_id,
        )

        access_token = self._jwt.create_access_token(user.id)
        raw_refresh, refresh_entity = self._auth_service._create_refresh_token(user.id)
        await self._auth_service._refresh_tokens.add(refresh_entity)

        logger.info("oauth.github.callback_success", user_id=str(user.id), email=user.email)
        return access_token, raw_refresh
