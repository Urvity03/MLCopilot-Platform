"""Orchestration service layer for projects and memberships."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from mlcopilot.domain.errors import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
)
from mlcopilot.domain.project import Project, ProjectMember
from mlcopilot.domain.role import Role

if TYPE_CHECKING:
    from mlcopilot.features.projects.repository import (
        MembershipRepository,
        ProjectRepository,
    )


class ProjectService:
    """Service to orchestrate project and membership workflows."""

    def __init__(
        self,
        project_repo: ProjectRepository,
        membership_repo: MembershipRepository,
    ) -> None:
        self._projects = project_repo
        self._members = membership_repo

    async def create_project(
        self,
        *,
        name: str,
        slug: str,
        description: str,
        creator_id: uuid.UUID,
    ) -> Project:
        """Create a new project workspace and register the creator as the Owner."""
        existing = await self._projects.get_by_slug(slug)
        if existing:
            msg = f"Project slug '{slug}' is already taken"
            raise ConflictError(msg)

        now = datetime.now(UTC)
        project = Project(
            id=uuid.uuid4(),
            name=name,
            slug=slug,
            description=description,
            created_by=creator_id,
            created_at=now,
        )

        await self._projects.add(project)

        # Creator becomes the Owner
        owner_member = ProjectMember(
            project_id=project.id,
            user_id=creator_id,
            role=Role.OWNER,
            added_at=now,
        )
        await self._members.add(owner_member)

        return project

    async def list_projects(self, *, user_id: uuid.UUID) -> list[Project]:
        """List all projects the user is a member of."""
        return await self._projects.list_for_user(user_id)

    async def get_project(self, *, project_id: uuid.UUID) -> Project | None:
        """Retrieve project details."""
        return await self._projects.get_by_id(project_id)

    async def delete_project(
        self, *, project_id: uuid.UUID, actor_role: Role
    ) -> None:
        """Delete a project workspace.

        Defensively verifies that the actor is the Owner (doc 10).
        """
        if actor_role != Role.OWNER:
            raise PermissionDeniedError("Only the project owner can delete the project.")

        await self._projects.delete(project_id)

    async def list_members(self, *, project_id: uuid.UUID) -> list[ProjectMember]:
        """List all project members."""
        return await self._members.list_members(project_id)

    async def add_member(
        self,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        role: Role,
    ) -> ProjectMember:
        """Invite/add a new member to the project."""
        if role == Role.OWNER:
            raise ConflictError("Cannot invite a user directly as an owner.")

        existing = await self._members.get_member(project_id, user_id)
        if existing:
            raise ConflictError("User is already a member of this project.")

        now = datetime.now(UTC)
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role,
            added_at=now,
        )
        await self._members.add(member)
        return member

    async def update_member_role(
        self,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        actor_role: Role,
        new_role: Role,
    ) -> ProjectMember:
        """Update a member's role."""
        member = await self._members.get_member(project_id, user_id)
        if not member:
            raise NotFoundError("Membership not found")

        # Invariant: Owner demotion
        if member.role == Role.OWNER:
            raise ConflictError("Owner cannot be demoted. Use transfer_ownership.")

        # Invariant: Admins cannot promote users to Owner
        if actor_role == Role.ADMIN and new_role == Role.OWNER:
            raise PermissionDeniedError("Admins cannot promote members to Owner.")

        # Invariant: Admins cannot demote other Admins
        if (
            actor_role == Role.ADMIN
            and member.role == Role.ADMIN
            and new_role != Role.ADMIN
        ):
            raise PermissionDeniedError("Admins cannot demote other Admins.")

        member.role = new_role
        await self._members.update(member)
        return member

    async def remove_member(
        self,
        *,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        actor_role: Role,
    ) -> None:
        """Revoke a member's membership."""
        member = await self._members.get_member(project_id, user_id)
        if not member:
            raise NotFoundError("Membership not found")

        # Invariant: Owner removal
        if member.role == Role.OWNER:
            raise ConflictError("Owner cannot be removed. Transfer ownership first.")

        # Invariant: Admins cannot remove other Admins or Owners
        if actor_role == Role.ADMIN and member.role in (Role.ADMIN, Role.OWNER):
            raise PermissionDeniedError(
                "Admins cannot remove other Admins or Owners."
            )

        await self._members.remove(project_id, user_id)

    async def transfer_ownership(
        self,
        *,
        project_id: uuid.UUID,
        current_owner_id: uuid.UUID,
        new_owner_id: uuid.UUID,
    ) -> None:
        """Transfer ownership of the project to another member.

        Demotes current owner to Admin.
        """
        if current_owner_id == new_owner_id:
            raise ConflictError("Cannot transfer ownership to yourself.")

        current_owner = await self._members.get_member(project_id, current_owner_id)
        if not current_owner or current_owner.role != Role.OWNER:
            raise PermissionDeniedError("Caller is not the project owner.")

        new_owner = await self._members.get_member(project_id, new_owner_id)
        if not new_owner:
            raise NotFoundError("New owner user is not a project member.")

        # Atomic switch
        current_owner.role = Role.ADMIN
        new_owner.role = Role.OWNER

        await self._members.update(current_owner)
        await self._members.update(new_owner)
