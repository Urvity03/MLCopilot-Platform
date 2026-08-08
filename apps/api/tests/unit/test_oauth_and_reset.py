from __future__ import annotations

import uuid

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from mlcopilot.main import app


@pytest.fixture(autouse=True)
def mock_oauth_credentials(monkeypatch):
    from mlcopilot.core.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(
        settings, "google_client_id", "test-google-client-id-12345.apps.googleusercontent.com"
    )
    monkeypatch.setattr(settings, "github_client_id", "test-github-client-id-abc123")


def test_google_oauth_redirect():
    with TestClient(app) as client:
        response = client.get("/api/v1/auth/oauth/google", follow_redirects=False)
        assert response.status_code == status.HTTP_302_FOUND
        assert "accounts.google.com" in response.headers["location"]
        assert (
            "client_id=test-google-client-id-12345.apps.googleusercontent.com"
            in response.headers["location"]
        )


def test_github_oauth_redirect():
    with TestClient(app) as client:
        response = client.get("/api/v1/auth/oauth/github", follow_redirects=False)
        assert response.status_code == status.HTTP_302_FOUND
        assert "github.com/login/oauth/authorize" in response.headers["location"]
        assert "client_id=test-github-client-id-abc123" in response.headers["location"]


def test_forgot_password_and_reset_flow():
    with TestClient(app) as client:
        # 1. Register a test user
        email = f"forgot_{uuid.uuid4().hex[:6]}@example.com"
        reg_resp = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "OldPassword123", "full_name": "Reset Test User"},
        )
        assert reg_resp.status_code == status.HTTP_201_CREATED

        # 2. Request forgot password
        forgot_resp = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": email},
        )
        assert forgot_resp.status_code == status.HTTP_200_OK
        data = forgot_resp.json()
        assert "If an account with that email exists" in data["message"]
        assert data["reset_link"] is not None

        # Extract token from reset link
        reset_link = data["reset_link"]
        token = reset_link.split("token=")[1]

        # 3. Reset password with valid token
        reset_resp = client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "new_password": "NewPassword456"},
        )
        assert reset_resp.status_code == status.HTTP_204_NO_CONTENT

        # 4. Login with new password
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "NewPassword456"},
        )
        assert login_resp.status_code == status.HTTP_200_OK
        assert "access_token" in login_resp.json()

        # 5. Try reusing reset token (should fail)
        reuse_resp = client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "new_password": "AnotherPassword789"},
        )
        assert reuse_resp.status_code == status.HTTP_401_UNAUTHORIZED
