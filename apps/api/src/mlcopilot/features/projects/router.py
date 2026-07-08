"""Router controllers for project and member management."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.projects.deps import (
    get_project_service,
    require_project_role,
)
from mlcopilot.features.projects.schemas import (
    InviteMemberRequest,
    MemberResponse,
    ProjectCreateRequest,
    ProjectResponse,
    TransferOwnershipRequest,
    UpdateMemberRoleRequest,
)
from mlcopilot.features.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    payload: ProjectCreateRequest,
    auth: Annotated[AuthContext, Depends(get_current_user)],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> ProjectResponse:
    """Create a new project workspace."""
    project = await service.create_project(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        creator_id=auth.user.id,
    )
    return ProjectResponse.model_validate(project)


@router.get(
    "",
    response_model=list[ProjectResponse],
)
async def list_projects(
    auth: Annotated[AuthContext, Depends(get_current_user)],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> list[ProjectResponse]:
    """List all projects the user is affiliated with."""
    projects = await service.list_projects(user_id=auth.user.id)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
async def get_project(
    context: Annotated[
        ProjectContext, Depends(require_project_role(Role.VIEWER))
    ],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> ProjectResponse:
    """Retrieve details of a project."""
    project = await service.get_project(project_id=context.project_id)
    return ProjectResponse.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project(
    context: Annotated[ProjectContext, Depends(require_project_role(Role.OWNER))],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> None:
    """Delete a project workspace."""
    await service.delete_project(
        project_id=context.project_id, actor_role=context.role
    )


@router.get(
    "/{project_id}/members",
    response_model=list[MemberResponse],
)
async def list_members(
    context: Annotated[
        ProjectContext, Depends(require_project_role(Role.VIEWER))
    ],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> list[MemberResponse]:
    """List project members."""
    members = await service.list_members(project_id=context.project_id)
    return [MemberResponse.model_validate(m) for m in members]


@router.post(
    "/{project_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    payload: InviteMemberRequest,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.ADMIN))],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> MemberResponse:
    """Add or invite a member to the project."""
    member = await service.add_member(
        project_id=context.project_id,
        user_id=payload.user_id,
        role=Role(payload.role),
    )
    return MemberResponse.model_validate(member)


@router.patch(
    "/{project_id}/members/{user_id}",
    response_model=MemberResponse,
)
async def update_member_role(
    user_id: UUID,
    payload: UpdateMemberRoleRequest,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.ADMIN))],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> MemberResponse:
    """Modify a project member's role."""
    member = await service.update_member_role(
        project_id=context.project_id,
        user_id=user_id,
        actor_role=context.role,
        new_role=Role(payload.role),
    )
    return MemberResponse.model_validate(member)


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    user_id: UUID,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.ADMIN))],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> None:
    """Revoke a member's workspace permission."""
    await service.remove_member(
        project_id=context.project_id, user_id=user_id, actor_role=context.role
    )


@router.post(
    "/{project_id}/transfer-ownership",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def transfer_ownership(
    payload: TransferOwnershipRequest,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.OWNER))],
    service: Annotated[ProjectService, Depends(get_project_service)],
) -> None:
    """Transfer project ownership to another member."""
    await service.transfer_ownership(
        project_id=context.project_id,
        current_owner_id=context.user.id,
        new_owner_id=payload.new_owner_id,
    )
