"""API controllers for document semantic search queries."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.features.embeddings.deps import get_embedding_service
from mlcopilot.features.embeddings.schemas import (
    SearchRequest,
    SearchResponse,
    SearchResponseItem,
)
from mlcopilot.features.embeddings.service import EmbeddingService
from mlcopilot.features.projects.deps import require_project_role
from mlcopilot.infrastructure.db.session import get_db_session

router = APIRouter(prefix="/projects", tags=["search"])


@router.post(
    "/{project_id}/search",
    response_model=SearchResponse,
)
async def search_project_documents(
    payload: SearchRequest,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    embedding_service: Annotated[EmbeddingService, Depends(get_embedding_service)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SearchResponse:
    """Perform cosine-similarity vector search inside the specified project."""
    results = await embedding_service.search(
        project_id=context.project_id,
        query=payload.query,
        top_k=payload.top_k,
        session=session,
    )

    response_items = [
        SearchResponseItem(
            upload_id=res.upload_id,
            chunk_id=res.chunk_id,
            score=res.score,
            content=res.content,
            metadata=res.metadata,
        )
        for res in results
    ]

    return SearchResponse(results=response_items)
