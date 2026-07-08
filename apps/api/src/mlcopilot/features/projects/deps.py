"""FastAPI dependencies for projects and membership authorization."""

from __future__ import annotations

import uuid
from collections.abc import Callable, Coroutine
from typing import Annotated, Any

from fastapi import Depends, Path

# We import AsyncSession from sqlalchemy.ext.asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.errors import NotFoundError, PermissionDeniedError
from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.projects.repository import (
    MembershipRepository,
    ProjectRepository,
)
from mlcopilot.features.projects.service import ProjectService
from mlcopilot.infrastructure.db.repositories.project import (
    SqlAlchemyMembershipRepository,
    SqlAlchemyProjectRepository,
)
from mlcopilot.infrastructure.db.session import get_db_session


async def get_project_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProjectRepository:
    """FastAPI dependency to resolve ProjectRepository."""
    return SqlAlchemyProjectRepository(session)


async def get_membership_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MembershipRepository:
    """FastAPI dependency to resolve MembershipRepository."""
    return SqlAlchemyMembershipRepository(session)


async def get_project_service(
    project_repo: Annotated[ProjectRepository, Depends(get_project_repository)],
    membership_repo: Annotated[
        MembershipRepository, Depends(get_membership_repository)
    ],
) -> ProjectService:
    """FastAPI dependency to resolve ProjectService."""
    return ProjectService(
        project_repo=project_repo,
        membership_repo=membership_repo,
    )


def require_project_role(
    minimum: Role,
) -> Callable[..., Coroutine[Any, Any, ProjectContext]]:
    """FastAPI dependency factory to enforce project-level RBAC role constraints.

    Resolves, in order:
      1. Authenticated context (JWT/API key).
      2. User role within project.
      3. Project existence (yields 404 on missing role to prevent discovery leakage).
      4. API key scope limits (yields 403 api_key_scope on violation).
    """

    async def dep(
        project_id: Annotated[uuid.UUID, Path(description="The project ID")],
        auth: Annotated[AuthContext, Depends(get_current_user)],
        members: Annotated[MembershipRepository, Depends(get_membership_repository)],
    ) -> ProjectContext:
        role = await members.role_of(project_id, auth.user.id)
        if role is None:
            # Prevent metadata discovery leakage by non-members (doc 10).
            raise NotFoundError("Project not found")

        if role < minimum:
            raise PermissionDeniedError("Insufficient project permissions")

        if auth.via == "api_key" and not auth.scopes_allow(minimum):
            raise PermissionDeniedError(
                "API key scope is insufficient for this action",
                code="api_key_scope",
            )

        return ProjectContext(project_id=project_id, user=auth.user, role=role)

    return dep
