"""Repository protocols for projects and memberships."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from mlcopilot.domain.project import Project, ProjectMember
from mlcopilot.domain.role import Role


class ProjectRepository(Protocol):
    """Protocol for project aggregate persistence."""

    async def get_by_id(self, project_id: UUID) -> Project | None:
        """Retrieve a project by its unique ID."""
        ...

    async def get_by_slug(self, slug: str) -> Project | None:
        """Retrieve a project by its unique slug."""
        ...

    async def add(self, project: Project) -> None:
        """Persist a new project aggregate."""
        ...

    async def list_for_user(self, user_id: UUID) -> list[Project]:
        """List all projects the user is a member of."""
        ...

    async def delete(self, project_id: UUID) -> None:
        """Delete a project aggregate by ID."""
        ...


class MembershipRepository(Protocol):
    """Protocol for project membership persistence."""

    async def role_of(self, project_id: UUID, user_id: UUID) -> Role | None:
        """Resolve a user's role within a specific project."""
        ...

    async def list_members(self, project_id: UUID) -> list[ProjectMember]:
        """List all memberships associated with a project."""
        ...

    async def get_member(self, project_id: UUID, user_id: UUID) -> ProjectMember | None:
        """Retrieve a specific membership record."""
        ...

    async def add(self, member: ProjectMember) -> None:
        """Persist a new project membership."""
        ...

    async def update(self, member: ProjectMember) -> None:
        """Update an existing membership (e.g. role change)."""
        ...

    async def remove(self, project_id: UUID, user_id: UUID) -> None:
        """Revoke and remove a user's project membership."""
        ...
