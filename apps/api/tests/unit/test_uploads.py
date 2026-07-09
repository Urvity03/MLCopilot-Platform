"""Unit tests for uploads feature (validation, storage, API)."""

from __future__ import annotations

import io
import json
import uuid
from datetime import UTC, datetime
from typing import BinaryIO

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.errors import UnprocessableError
from mlcopilot.domain.role import Role
from mlcopilot.domain.upload import Upload, UploadKind, UploadParseStatus
from mlcopilot.domain.user import User
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.projects.deps import get_membership_repository
from mlcopilot.features.uploads.deps import get_blob_storage, get_upload_repository
from mlcopilot.features.uploads.router import router as uploads_router
from mlcopilot.features.uploads.service import UploadService

# ── Fakes ────────────────────────────────────────────────────────────

class FakeBlobStorage:
    def __init__(self) -> None:
        self.blobs: dict[uuid.UUID, bytes] = {}

    async def put(
        self,
        project_id: uuid.UUID,
        upload_id: uuid.UUID,
        filename: str,
        data: BinaryIO,
        length: int,
        content_type: str = "application/octet-stream",
    ) -> str:
        data.seek(0)
        self.blobs[upload_id] = data.read()
        return f"s3://fake-bucket/projects/{project_id}/uploads/{upload_id}/{filename}"


class FakeUploadRepository:
    def __init__(self) -> None:
        self.uploads: dict[uuid.UUID, Upload] = {}

    async def get_by_id(self, upload_id: uuid.UUID) -> Upload | None:
        return self.uploads.get(upload_id)

    async def list_by_project(self, project_id: uuid.UUID, limit: int = 50) -> list[Upload]:
        return [u for u in self.uploads.values() if u.project_id == project_id]

    async def add(self, upload: Upload) -> None:
        self.uploads[upload.id] = upload


class FakeMembershipRepository:
    def __init__(self, role: Role | None) -> None:
        self.role = role

    async def role_of(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Role | None:
        return self.role


# ── Service Layer Tests ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_service_valid_pdf() -> None:
    """Service correctly identifies and stores a valid PDF."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    data = io.BytesIO(b"%PDF-1.4\ncontent")

    upload = await service.create_upload(
        project_id=uuid.uuid4(),
        filename="test.pdf",
        data=data,
        content_type="application/pdf",
        uploaded_by=uuid.uuid4(),
    )

    assert upload.kind == UploadKind.PAPER
    assert upload.id in repo.uploads
    assert storage.blobs[upload.id] == b"%PDF-1.4\ncontent"


@pytest.mark.asyncio
async def test_upload_service_invalid_pdf() -> None:
    """Service rejects PDF with invalid magic bytes."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    data = io.BytesIO(b"Not a PDF")

    with pytest.raises(UnprocessableError, match="Invalid PDF format"):
        await service.create_upload(
            project_id=uuid.uuid4(),
            filename="test.pdf",
            data=data,
            content_type="application/pdf",
            uploaded_by=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_upload_service_valid_notebook() -> None:
    """Service correctly identifies and stores a valid Jupyter notebook."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    content = json.dumps({"nbformat": 4, "cells": []}).encode("utf-8")
    data = io.BytesIO(content)

    upload = await service.create_upload(
        project_id=uuid.uuid4(),
        filename="test.ipynb",
        data=data,
        content_type="application/json",
        uploaded_by=uuid.uuid4(),
    )

    assert upload.kind == UploadKind.NOTEBOOK
    assert upload.id in repo.uploads


@pytest.mark.asyncio
async def test_upload_service_invalid_notebook_json() -> None:
    """Service rejects notebook that is not valid JSON."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    data = io.BytesIO(b"Invalid JSON")

    with pytest.raises(UnprocessableError, match="not valid JSON"):
        await service.create_upload(
            project_id=uuid.uuid4(),
            filename="test.ipynb",
            data=data,
            content_type="application/json",
            uploaded_by=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_upload_service_invalid_notebook_missing_nbformat() -> None:
    """Service rejects notebook that lacks nbformat attribute."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    content = json.dumps({"cells": []}).encode("utf-8")
    data = io.BytesIO(content)

    with pytest.raises(UnprocessableError, match="missing nbformat"):
        await service.create_upload(
            project_id=uuid.uuid4(),
            filename="test.ipynb",
            data=data,
            content_type="application/json",
            uploaded_by=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_upload_service_unsupported_extension() -> None:
    """Service rejects extensions other than .pdf and .ipynb."""
    repo = FakeUploadRepository()
    storage = FakeBlobStorage()
    service = UploadService(repo, storage)

    data = io.BytesIO(b"Hello")

    with pytest.raises(UnprocessableError, match="Unsupported file extension"):
        await service.create_upload(
            project_id=uuid.uuid4(),
            filename="test.txt",
            data=data,
            content_type="text/plain",
            uploaded_by=uuid.uuid4(),
        )


# ── API Router Tests ─────────────────────────────────────────────────

@pytest.fixture
def app_with_overrides() -> FastAPI:
    """FastAPI instance with mocked upload dependencies."""
    app = FastAPI()
    app.include_router(uploads_router)

    from mlcopilot.core.exceptions import register_exception_handlers
    register_exception_handlers(app)

    repo = FakeUploadRepository()
    storage = FakeBlobStorage()

    app.dependency_overrides[get_upload_repository] = lambda: repo
    app.dependency_overrides[get_blob_storage] = lambda: storage

    # Pre-populate data for GET tests
    project_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    upload_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    repo.uploads[upload_id] = Upload(
        id=upload_id,
        project_id=project_id,
        kind=UploadKind.PAPER,
        filename="existing.pdf",
        storage_uri="s3://bucket/existing.pdf",
        parse_status=UploadParseStatus.PENDING,
        metadata={},
        uploaded_by=uuid.uuid4(),
        created_at=datetime.now(UTC),
    )

    return app


def make_client(app: FastAPI, role: Role | None) -> TestClient:
    """Helper to build a TestClient with specific project role overrides."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash="hash",
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    def override_get_current_user() -> AuthContext:
        return AuthContext(user=user, via="jwt")

    def override_get_membership_repository() -> FakeMembershipRepository:
        return FakeMembershipRepository(role)

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_membership_repository] = override_get_membership_repository

    return TestClient(app)


def test_api_create_upload_success(app_with_overrides: FastAPI) -> None:
    """MEMBER can upload valid artifact."""
    client = make_client(app_with_overrides, Role.MEMBER)
    project_id = "00000000-0000-0000-0000-000000000001"

    response = client.post(
        f"/projects/{project_id}/uploads",
        files={"file": ("test.pdf", b"%PDF-1.4\ncontent", "application/pdf")},
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["filename"] == "test.pdf"
    assert data["kind"] == "paper"
    assert data["parse_status"] == "pending"


def test_api_create_upload_forbidden_for_viewer(app_with_overrides: FastAPI) -> None:
    """VIEWER cannot upload artifacts (HTTP 403)."""
    client = make_client(app_with_overrides, Role.VIEWER)
    project_id = "00000000-0000-0000-0000-000000000001"

    response = client.post(
        f"/projects/{project_id}/uploads",
        files={"file": ("test.pdf", b"%PDF-1.4\ncontent", "application/pdf")},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_api_create_upload_not_found_for_non_member(app_with_overrides: FastAPI) -> None:
    """Non-members receive HTTP 404 on upload to avoid existence leakage."""
    client = make_client(app_with_overrides, None)
    project_id = "00000000-0000-0000-0000-000000000001"

    response = client.post(
        f"/projects/{project_id}/uploads",
        files={"file": ("test.pdf", b"%PDF-1.4\ncontent", "application/pdf")},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_api_list_uploads(app_with_overrides: FastAPI) -> None:
    """VIEWER can list uploads for a project."""
    client = make_client(app_with_overrides, Role.VIEWER)
    project_id = "00000000-0000-0000-0000-000000000001"

    response = client.get(f"/projects/{project_id}/uploads")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "existing.pdf"


def test_api_get_upload(app_with_overrides: FastAPI) -> None:
    """VIEWER can retrieve a specific upload."""
    client = make_client(app_with_overrides, Role.VIEWER)
    project_id = "00000000-0000-0000-0000-000000000001"
    upload_id = "11111111-1111-1111-1111-111111111111"

    response = client.get(f"/projects/{project_id}/uploads/{upload_id}")

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == upload_id


def test_api_get_upload_not_found(app_with_overrides: FastAPI) -> None:
    """Returns HTTP 404 for non-existent upload."""
    client = make_client(app_with_overrides, Role.VIEWER)
    project_id = "00000000-0000-0000-0000-000000000001"
    upload_id = str(uuid.uuid4())

    response = client.get(f"/projects/{project_id}/uploads/{upload_id}")

    assert response.status_code == status.HTTP_404_NOT_FOUND
