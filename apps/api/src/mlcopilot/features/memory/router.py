"""Router controllers for Project Memory."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.memory import MemoryKind
from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.features.memory.deps import get_memory_service
from mlcopilot.features.memory.schemas import (
    MemoryPageResponse,
    MemoryRecordResponse,
)
from mlcopilot.features.memory.service import MemoryService
from mlcopilot.features.projects.deps import require_project_role

router = APIRouter(prefix="/projects/{project_id}/memory", tags=["memory"])


@router.get(
    "",
    response_model=MemoryPageResponse,
)
async def list_memory_records(
    context: Annotated[
        ProjectContext, Depends(require_project_role(Role.VIEWER))
    ],
    service: Annotated[MemoryService, Depends(get_memory_service)],
    kind: Annotated[MemoryKind | None, Query(description="Filter by memory kind")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Page limit")] = 25,
    cursor: Annotated[str | None, Query(description="Opaque cursor")] = None,
) -> MemoryPageResponse:
    """Retrieve a paginated, filtered list of project memory records."""
    page = await service.list_records(
        project_id=context.project_id,
        kind=kind,
        limit=limit,
        cursor=cursor,
    )
    return MemoryPageResponse(
        items=[MemoryRecordResponse.model_validate(rec) for rec in page.items],
        next_cursor=page.next_cursor,
    )


@router.get(
    "/{record_id}",
    response_model=MemoryRecordResponse,
)
async def get_memory_record(
    record_id: UUID,
    context: Annotated[
        ProjectContext, Depends(require_project_role(Role.VIEWER))
    ],
    service: Annotated[MemoryService, Depends(get_memory_service)],
) -> MemoryRecordResponse:
    """Retrieve details of a specific project memory record."""
    record = await service.get_record(
        project_id=context.project_id, record_id=record_id
    )
    if not record:
        raise NotFoundError("Memory record not found")
    return MemoryRecordResponse.model_validate(record)
