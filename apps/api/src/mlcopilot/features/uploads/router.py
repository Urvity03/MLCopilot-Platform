"""API routes for project uploads."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, status

from mlcopilot.domain.errors import NotFoundError, UnprocessableError
from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.domain.upload import UploadKind, UploadParseStatus
from mlcopilot.features.embeddings.deps import get_embedding_service
from mlcopilot.features.embeddings.service import EmbeddingService
from mlcopilot.features.projects.deps import require_project_role
from mlcopilot.features.uploads.deps import get_upload_service
from mlcopilot.features.uploads.schemas import UploadResponse
from mlcopilot.features.uploads.service import UploadService

router = APIRouter(prefix="/projects/{project_id}/uploads", tags=["uploads"])


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload(
    file: UploadFile,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.MEMBER))],
    service: Annotated[UploadService, Depends(get_upload_service)],
    embedding_service: Annotated[EmbeddingService, Depends(get_embedding_service)],
    background_tasks: BackgroundTasks,
) -> UploadResponse:
    """Upload a new artifact to the project's knowledge base."""
    if not file.filename:
        raise UnprocessableError("Filename is required")

    upload = await service.create_upload(
        project_id=context.project_id,
        filename=file.filename,
        data=file.file,
        content_type=file.content_type or "application/octet-stream",
        uploaded_by=context.user.id,
    )

    if upload.kind == UploadKind.PAPER and upload.parse_status == UploadParseStatus.PARSED:
        background_tasks.add_task(
            embedding_service.generate_embeddings_for_upload,
            upload.id,
        )

    return UploadResponse.model_validate(upload)


@router.get(
    "",
    response_model=list[UploadResponse],
)
async def list_uploads(
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    service: Annotated[UploadService, Depends(get_upload_service)],
) -> list[UploadResponse]:
    """List all uploads for the project."""
    uploads = await service.list_project_uploads(project_id=context.project_id)
    return [UploadResponse.model_validate(u) for u in uploads]


@router.get(
    "/{upload_id}",
    response_model=UploadResponse,
)
async def get_upload(
    upload_id: UUID,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    service: Annotated[UploadService, Depends(get_upload_service)],
) -> UploadResponse:
    """Retrieve details for a specific upload."""
    upload = await service.get_upload(upload_id=upload_id)
    if not upload or upload.project_id != context.project_id:
        raise NotFoundError("Upload not found")
    return UploadResponse.model_validate(upload)
