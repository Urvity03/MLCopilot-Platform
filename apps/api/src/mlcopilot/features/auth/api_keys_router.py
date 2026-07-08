"""API key management endpoints (docs/architecture/11-api-contracts.md)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from mlcopilot.domain.auth import AuthContext
from mlcopilot.features.auth.deps import get_auth_service, get_current_user
from mlcopilot.features.auth.schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyResponse,
)
from mlcopilot.features.auth.service import AuthService

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post(
    "",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    current_auth: Annotated[AuthContext, Depends(get_current_user)],
) -> ApiKeyCreateResponse:
    """Generate a new API key for the authenticated user."""
    plain_key, api_key = await auth_service.create_api_key(
        user_id=current_auth.user.id,
        name=payload.name,
        scopes=payload.scopes,
    )
    return ApiKeyCreateResponse(
        plain_key=plain_key,
        api_key=ApiKeyResponse(
            id=api_key.id,
            user_id=api_key.user_id,
            name=api_key.name,
            prefix=api_key.prefix,
            scopes=api_key.scopes,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at,
        ),
    )


@router.get(
    "",
    response_model=list[ApiKeyResponse],
)
async def list_api_keys(
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    current_auth: Annotated[AuthContext, Depends(get_current_user)],
) -> list[ApiKeyResponse]:
    """List all active API keys for the authenticated user."""
    keys = await auth_service.list_api_keys(user_id=current_auth.user.id)
    return [
        ApiKeyResponse(
            id=key.id,
            user_id=key.user_id,
            name=key.name,
            prefix=key.prefix,
            scopes=key.scopes,
            created_at=key.created_at,
            updated_at=key.updated_at,
        )
        for key in keys
    ]


@router.delete(
    "/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_api_key(
    key_id: UUID,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    current_auth: Annotated[AuthContext, Depends(get_current_user)],
) -> None:
    """Revoke an API key immediately and terminally."""
    await auth_service.revoke_api_key(key_id=key_id, user_id=current_auth.user.id)
