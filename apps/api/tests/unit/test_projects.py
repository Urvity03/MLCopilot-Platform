"""Unit tests for project management and RBAC authorization flow."""

from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.errors import ConflictError, PermissionDeniedError
from mlcopilot.domain.project import Project, ProjectMember
from mlcopilot.domain.role import Role
from mlcopilot.domain.user import User
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.projects.deps import (
    get_membership_repository,
    get_project_repository,
)
from mlcopilot.features.projects.router import router as projects_router
from mlcopilot.features.projects.service import ProjectService

if TYPE_CHECKING:
    pass


# ── Role Enum Test ──────────────────────────────────────────────────


def test_role_comparisons() -> None:
    """Verify ordered, comparable roles hierarchy."""
    assert Role.VIEWER < Role.MEMBER
    assert Role.MEMBER < Role.ADMIN
    assert Role.ADMIN < Role.OWNER

    assert Role.OWNER > Role.ADMIN
    assert Role.ADMIN >= Role.MEMBER
    assert Role.MEMBER >= Role.VIEWER
    assert Role.VIEWER <= Role.VIEWER


# ── Fake Repositories ────────────────────────────────────────────────


class FakeProjectRepository:
    def __init__(self) -> None:
        self.projects: dict[uuid.UUID, Project] = {}

    async def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        return self.projects.get(project_id)

    async def get_by_slug(self, slug: str) -> Project | None:
        for project in self.projects.values():
            if project.slug == slug:
                return project
        return None

    async def add(self, project: Project) -> None:
        self.projects[project.id] = project

    async def list_for_user(self, user_id: uuid.UUID) -> list[Project]:
        return list(self.projects.values())

    async def delete(self, project_id: uuid.UUID) -> None:
        if project_id in self.projects:
            del self.projects[project_id]


class FakeMembershipRepository:
    def __init__(self) -> None:
        self.members: dict[tuple[uuid.UUID, uuid.UUID], ProjectMember] = {}

    async def role_of(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Role | None:
        member = self.members.get((project_id, user_id))
        return member.role if member else None

    async def list_members(self, project_id: uuid.UUID) -> list[ProjectMember]:
        return [m for m in self.members.values() if m.project_id == project_id]

    async def get_member(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> ProjectMember | None:
        return self.members.get((project_id, user_id))

    async def add(self, member: ProjectMember) -> None:
        self.members[(member.project_id, member.user_id)] = member

    async def update(self, member: ProjectMember) -> None:
        self.members[(member.project_id, member.user_id)] = member

    async def remove(self, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
        key = (project_id, user_id)
        if key in self.members:
            del self.members[key]


# ── ProjectService Tests ─────────────────────────────────────────────


@pytest.fixture
def fake_repos() -> tuple[FakeProjectRepository, FakeMembershipRepository]:
    return FakeProjectRepository(), FakeMembershipRepository()


@pytest.fixture
def project_service(
    fake_repos: tuple[FakeProjectRepository, FakeMembershipRepository],
) -> ProjectService:
    project_repo, membership_repo = fake_repos
    return ProjectService(project_repo, membership_repo)


@pytest.mark.anyio
async def test_create_project_registers_owner(
    project_service: ProjectService,
    fake_repos: tuple[FakeProjectRepository, FakeMembershipRepository],
) -> None:
    """Creating a project automatically creates owner membership."""
    _, m_repo = fake_repos
    creator_id = uuid.uuid4()

    project = await project_service.create_project(
        name="Test", slug="test", description="desc", creator_id=creator_id
    )

    assert project.name == "Test"
    assert project.slug == "test"
    assert project.created_by == creator_id

    # Verify Owner membership
    role = await m_repo.role_of(project.id, creator_id)
    assert role == Role.OWNER


@pytest.mark.anyio
async def test_create_project_slug_conflict(project_service: ProjectService) -> None:
    """Enforce unique slug constraint."""
    creator_id = uuid.uuid4()
    await project_service.create_project(
        name="Test 1", slug="test-slug", description="desc", creator_id=creator_id
    )

    with pytest.raises(ConflictError):
        await project_service.create_project(
            name="Test 2", slug="test-slug", description="desc", creator_id=creator_id
        )


@pytest.mark.anyio
async def test_delete_project_owner_only(
    project_service: ProjectService,
    fake_repos: tuple[FakeProjectRepository, FakeMembershipRepository],
) -> None:
    """Only Owner is permitted to delete projects."""
    p_repo, _ = fake_repos
    creator_id = uuid.uuid4()
    project = await project_service.create_project(
        name="Test", slug="test", description="", creator_id=creator_id
    )

    # Admin delete attempt fails
    with pytest.raises(PermissionDeniedError):
        await project_service.delete_project(
            project_id=project.id, actor_role=Role.ADMIN
        )

    # Owner delete attempt succeeds
    await project_service.delete_project(project_id=project.id, actor_role=Role.OWNER)
    assert await p_repo.get_by_id(project.id) is None


@pytest.mark.anyio
async def test_update_member_role_invariants(
    project_service: ProjectService,
) -> None:
    """Verify role update boundaries (admin demotions and owner shifts)."""
    creator_id = uuid.uuid4()
    project = await project_service.create_project(
        name="Test", slug="test", description="", creator_id=creator_id
    )

    admin_user_id = uuid.uuid4()
    member_user_id = uuid.uuid4()

    await project_service.add_member(
        project_id=project.id, user_id=admin_user_id, role=Role.ADMIN
    )
    await project_service.add_member(
        project_id=project.id, user_id=member_user_id, role=Role.MEMBER
    )

    # Invariant: Owner cannot be demoted
    with pytest.raises(ConflictError):
        await project_service.update_member_role(
            project_id=project.id,
            user_id=creator_id,
            actor_role=Role.OWNER,
            new_role=Role.MEMBER,
        )

    # Invariant: Admins cannot promote users to Owner
    with pytest.raises(PermissionDeniedError):
        await project_service.update_member_role(
            project_id=project.id,
            user_id=member_user_id,
            actor_role=Role.ADMIN,
            new_role=Role.OWNER,
        )

    # Invariant: Admins cannot demote other Admins
    with pytest.raises(PermissionDeniedError):
        await project_service.update_member_role(
            project_id=project.id,
            user_id=admin_user_id,
            actor_role=Role.ADMIN,
            new_role=Role.MEMBER,
        )

    # Owner can demote Admin
    updated = await project_service.update_member_role(
        project_id=project.id,
        user_id=admin_user_id,
        actor_role=Role.OWNER,
        new_role=Role.MEMBER,
    )
    assert updated.role == Role.MEMBER


@pytest.mark.anyio
async def test_transfer_ownership(
    project_service: ProjectService,
    fake_repos: tuple[FakeProjectRepository, FakeMembershipRepository],
) -> None:
    """Ownership transfer atomically demotes current owner to Admin."""
    _, m_repo = fake_repos
    owner_id = uuid.uuid4()
    new_owner_id = uuid.uuid4()

    project = await project_service.create_project(
        name="Test", slug="test", description="", creator_id=owner_id
    )
    await project_service.add_member(
        project_id=project.id, user_id=new_owner_id, role=Role.MEMBER
    )

    await project_service.transfer_ownership(
        project_id=project.id,
        current_owner_id=owner_id,
        new_owner_id=new_owner_id,
    )

    # Old owner demoted to admin
    assert await m_repo.role_of(project.id, owner_id) == Role.ADMIN
    # New owner promoted to owner
    assert await m_repo.role_of(project.id, new_owner_id) == Role.OWNER


# ── Dependency and Route Tests ──────────────────────────────────────


@pytest.fixture
def client_and_repos() -> (
    tuple[TestClient, FakeProjectRepository, FakeMembershipRepository]
):
    app = FastAPI()
    app.include_router(projects_router)

    p_repo = FakeProjectRepository()
    m_repo = FakeMembershipRepository()

    app.dependency_overrides[get_project_repository] = lambda: p_repo
    app.dependency_overrides[get_membership_repository] = lambda: m_repo

    # Set up auth mock
    test_user = User(
        id=uuid.uuid4(),
        email="test@test.com",
        password_hash="",
        full_name="Tester",
        is_active=True,
        is_superuser=False,
        created_at=datetime.datetime.now(datetime.UTC),
        updated_at=datetime.datetime.now(datetime.UTC),
    )
    mock_auth = AuthContext(user=test_user, via="jwt")
    app.dependency_overrides[get_current_user] = lambda: mock_auth

    # Map validation errors to clean envelope
    from mlcopilot.core.exceptions import register_exception_handlers

    register_exception_handlers(app)

    return TestClient(app), p_repo, m_repo


def test_require_project_role_leakage_404(
    client_and_repos: tuple[
        TestClient, FakeProjectRepository, FakeMembershipRepository
    ],
) -> None:
    """Non-members receive 404 NotFound instead of 403 Forbidden to hide existence."""
    client, p_repo, _ = client_and_repos
    project_id = uuid.uuid4()

    # Project exists in repo, but user has no membership
    p_repo.projects[project_id] = Project(
        id=project_id,
        name="Secret",
        slug="secret",
        description="",
        created_by=uuid.uuid4(),
        created_at=datetime.datetime.now(datetime.UTC),
    )

    # Access attempts return 404
    response = client.get(f"/projects/{project_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["error"]["code"] == "not_found"


def test_require_project_role_403_insufficient(
    client_and_repos: tuple[
        TestClient, FakeProjectRepository, FakeMembershipRepository
    ],
) -> None:
    """Members with insufficient role permissions receive 403 Forbidden."""
    client, p_repo, m_repo = client_and_repos
    project_id = uuid.uuid4()

    from typing import cast
    app = cast(FastAPI, client.app)
    user_id = app.dependency_overrides[get_current_user]().user.id

    p_repo.projects[project_id] = Project(
        id=project_id,
        name="Public",
        slug="public",
        description="",
        created_by=uuid.uuid4(),
        created_at=datetime.datetime.now(datetime.UTC),
    )

    # User is Viewer
    m_repo.members[(project_id, user_id)] = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        role=Role.VIEWER,
        added_at=datetime.datetime.now(datetime.UTC),
    )

    # Attempt delete (requires Owner role) -> returns 403
    response = client.delete(f"/projects/{project_id}")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["code"] == "permission_denied"


def test_require_project_role_api_key_scopes(
    client_and_repos: tuple[
        TestClient, FakeProjectRepository, FakeMembershipRepository
    ],
) -> None:
    """Verify api_key_scopes caps are enforced at dependency factor."""
    client, p_repo, m_repo = client_and_repos
    project_id = uuid.uuid4()

    from typing import cast
    app = cast(FastAPI, client.app)
    user = app.dependency_overrides[get_current_user]().user

    # Override auth to simulate api key with 'read' only scopes
    api_key_auth = AuthContext(user=user, via="api_key", api_key_scopes=["read"])
    app.dependency_overrides[get_current_user] = lambda: api_key_auth

    p_repo.projects[project_id] = Project(
        id=project_id,
        name="Public",
        slug="public",
        description="",
        created_by=user.id,
        created_at=datetime.datetime.now(datetime.UTC),
    )

    # User is Owner (but API key is capped at 'read')
    m_repo.members[(project_id, user.id)] = ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role=Role.OWNER,
        added_at=datetime.datetime.now(datetime.UTC),
    )

    # Attempt member invite (requires ADMIN role, write/admin key scope).
    # This should return HTTP 403 api_key_scope.
    invite_payload = {"user_id": str(uuid.uuid4()), "role": "member"}
    response = client.post(f"/projects/{project_id}/members", json=invite_payload)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["code"] == "api_key_scope"
