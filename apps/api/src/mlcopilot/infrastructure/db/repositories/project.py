"""SQLAlchemy implementation of project and membership repositories."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select

from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.project import Project as DomainProject
from mlcopilot.domain.project import ProjectMember as DomainProjectMember
from mlcopilot.domain.role import Role
from mlcopilot.infrastructure.db.models.project import Project as DbProject
from mlcopilot.infrastructure.db.models.project import ProjectMember as DbProjectMember

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyProjectRepository:
    """SQLAlchemy implementation of the ProjectRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_project: DbProject) -> DomainProject:
        return DomainProject(
            id=db_project.id,
            name=db_project.name,
            slug=db_project.slug,
            description=db_project.description,
            created_by=db_project.created_by,
            created_at=db_project.created_at,
        )

    async def get_by_id(self, project_id: UUID) -> DomainProject | None:
        """Retrieve a project by ID."""
        db_project = await self._session.get(DbProject, project_id)
        if not db_project:
            return None
        return self._to_domain(db_project)

    async def get_by_slug(self, slug: str) -> DomainProject | None:
        """Retrieve a project by case-sensitive slug."""
        result = await self._session.execute(
            select(DbProject).where(DbProject.slug == slug)
        )
        db_project = result.scalar_one_or_none()
        if not db_project:
            return None
        return self._to_domain(db_project)

    async def add(self, project: DomainProject) -> None:
        """Save a new project."""
        db_project = DbProject(
            id=project.id,
            name=project.name,
            slug=project.slug,
            description=project.description,
            created_by=project.created_by,
            created_at=project.created_at,
        )
        self._session.add(db_project)
        await self._session.flush()

    async def list_for_user(self, user_id: UUID) -> list[DomainProject]:
        """List all projects the user is a member of."""
        result = await self._session.execute(
            select(DbProject)
            .join(DbProjectMember, DbProject.id == DbProjectMember.project_id)
            .where(DbProjectMember.user_id == user_id)
            .order_by(DbProject.created_at.desc())
        )
        return [self._to_domain(db_p) for db_p in result.scalars().all()]

    async def delete(self, project_id: UUID) -> None:
        """Delete a project by ID."""
        db_project = await self._session.get(DbProject, project_id)
        if not db_project:
            msg = f"Project with ID {project_id} not found"
            raise NotFoundError(msg)
        await self._session.delete(db_project)
        await self._session.flush()


class SqlAlchemyMembershipRepository:
    """SQLAlchemy implementation of the MembershipRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_member: DbProjectMember) -> DomainProjectMember:
        return DomainProjectMember(
            project_id=db_member.project_id,
            user_id=db_member.user_id,
            role=Role(db_member.role),
            added_at=db_member.added_at,
        )

    async def role_of(self, project_id: UUID, user_id: UUID) -> Role | None:
        """Resolve a user's role within a project."""
        result = await self._session.execute(
            select(DbProjectMember.role).where(
                DbProjectMember.project_id == project_id,
                DbProjectMember.user_id == user_id,
            )
        )
        role_str = result.scalar_one_or_none()
        if not role_str:
            return None
        return Role(role_str)

    async def list_members(self, project_id: UUID) -> list[DomainProjectMember]:
        """List all memberships in a project."""
        result = await self._session.execute(
            select(DbProjectMember)
            .where(DbProjectMember.project_id == project_id)
            .order_by(DbProjectMember.added_at.asc())
        )
        return [self._to_domain(db_m) for db_m in result.scalars().all()]

    async def get_member(
        self, project_id: UUID, user_id: UUID
    ) -> DomainProjectMember | None:
        """Retrieve a specific membership record."""
        db_member = await self._session.get(DbProjectMember, (project_id, user_id))
        if not db_member:
            return None
        return self._to_domain(db_member)

    async def add(self, member: DomainProjectMember) -> None:
        """Persist a new membership."""
        db_member = DbProjectMember(
            project_id=member.project_id,
            user_id=member.user_id,
            role=member.role.value,
            added_at=member.added_at,
        )
        self._session.add(db_member)
        await self._session.flush()

    async def update(self, member: DomainProjectMember) -> None:
        """Update an existing membership."""
        db_member = await self._session.get(
            DbProjectMember, (member.project_id, member.user_id)
        )
        if not db_member:
            msg = f"Membership for user {member.user_id} not found"
            raise NotFoundError(msg)
        db_member.role = member.role.value
        await self._session.flush()

    async def remove(self, project_id: UUID, user_id: UUID) -> None:
        """Revoke a user's membership."""
        db_member = await self._session.get(
            DbProjectMember, (project_id, user_id)
        )
        if not db_member:
            msg = f"Membership for user {user_id} not found"
            raise NotFoundError(msg)
        await self._session.delete(db_member)
        await self._session.flush()
