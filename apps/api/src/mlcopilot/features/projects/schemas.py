"""Pydantic schemas for project and membership request/response validation."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateRequest(BaseModel):
    """Payload to create a new project workspace."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: str = Field("", max_length=1024)


class ProjectResponse(BaseModel):
    """Serialization representation of a project."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str
    created_by: UUID
    created_at: datetime


class MemberResponse(BaseModel):
    """Serialization representation of a project membership."""

    model_config = ConfigDict(from_attributes=True)

    project_id: UUID
    user_id: UUID
    role: str
    added_at: datetime


class InviteMemberRequest(BaseModel):
    """Payload to invite a new user to a project."""

    user_id: UUID
    role: str = Field(..., pattern="^(admin|member|viewer)$")


class UpdateMemberRoleRequest(BaseModel):
    """Payload to update a project member's role."""

    role: str = Field(..., pattern="^(admin|member|viewer)$")


class TransferOwnershipRequest(BaseModel):
    """Payload to transfer project ownership."""

    new_owner_id: UUID
