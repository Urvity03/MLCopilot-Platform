"""Authentication request and response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload to register a new user."""

    email: EmailStr = Field(..., description="Unique email address for the user account.")
    password: str = Field(..., min_length=1, description="Plaintext password.")
    full_name: str = Field(..., min_length=1, description="User's full display name.")


class UserResponse(BaseModel):
    """Serialized user details returned to client."""

    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    """Payload to authenticate using credentials."""

    email: EmailStr = Field(..., description="User account email address.")
    password: str = Field(..., description="Account password.")


class TokenResponse(BaseModel):
    """Response containing minted access token."""

    access_token: str
    token_type: str = "bearer"  # noqa: S105


class ApiKeyCreateRequest(BaseModel):
    """Payload to generate a new API key."""

    name: str = Field(
        ..., min_length=1, description="Friendly identifier for the API key."
    )
    scopes: list[str] = Field(
        default_factory=lambda: ["read"],
        description="Assigned authorization scopes.",
    )


class ApiKeyResponse(BaseModel):
    """Serialized API key metadata."""

    id: UUID
    user_id: UUID
    name: str
    prefix: str
    scopes: list[str]
    created_at: datetime
    updated_at: datetime


class ApiKeyCreateResponse(BaseModel):
    """Response containing the generated plaintext key shown once."""

    plain_key: str
    api_key: ApiKeyResponse
