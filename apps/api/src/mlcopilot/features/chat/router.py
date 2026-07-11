"""API controllers for RAG chat and conversational sessions."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from mlcopilot.domain.chat import ConversationRepository
from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.project import ProjectContext
from mlcopilot.domain.role import Role
from mlcopilot.features.chat.deps import get_conversation_repository, get_rag_service
from mlcopilot.features.chat.schemas import (
    ChatMessageResponse,
    ChatRequest,
    CitationResponse,
    ConversationDetailResponse,
    ConversationResponse,
)
from mlcopilot.features.chat.service import RAGService
from mlcopilot.features.projects.deps import get_project_repository, require_project_role
from mlcopilot.features.projects.repository import ProjectRepository

router = APIRouter(prefix="/projects", tags=["chat"])


@router.post(
    "/{project_id}/chat",
)
async def chat_with_project(
    project_id: uuid.UUID,
    payload: ChatRequest,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    rag_service: Annotated[RAGService, Depends(get_rag_service)],
    project_repo: Annotated[ProjectRepository, Depends(get_project_repository)],
) -> Any:
    """Execute a RAG chat query against the project's knowledge base."""
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise NotFoundError("Project not found")

    if payload.stream:
        generator = rag_service.chat_stream(
            project_id=context.project_id,
            project_name=project.name,
            user_id=context.user.id,
            question=payload.question,
            conversation_id=payload.conversation_id,
        )
        return StreamingResponse(generator, media_type="text/event-stream")

    # Non-streaming complete generation
    resp = await rag_service.chat(
        project_id=context.project_id,
        project_name=project.name,
        user_id=context.user.id,
        question=payload.question,
        conversation_id=payload.conversation_id,
    )
    citations = [
        CitationResponse(
            upload_id=c.upload_id,
            filename=c.filename,
            chunk_id=c.chunk_id,
            content=c.content,
            position=c.position,
            score=c.score,
        )
        for c in resp.citations
    ]
    return {
        "content": resp.content,
        "citations": citations,
    }


@router.get(
    "/{project_id}/conversations",
    response_model=list[ConversationResponse],
)
async def list_conversations(
    project_id: uuid.UUID,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    conversation_repo: Annotated[ConversationRepository, Depends(get_conversation_repository)],
) -> list[ConversationResponse]:
    """Retrieve all conversations for the authenticated user in this project."""
    convs = await conversation_repo.list_by_project(
        project_id=context.project_id, user_id=context.user.id
    )
    return [
        ConversationResponse(
            id=c.id,
            project_id=c.project_id,
            title=c.title,
            created_at=c.created_at,
        )
        for c in convs
    ]


@router.get(
    "/{project_id}/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
async def get_conversation_details(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.VIEWER))],
    conversation_repo: Annotated[ConversationRepository, Depends(get_conversation_repository)],
) -> ConversationDetailResponse:
    """Retrieve full detail for a conversation including all message history."""
    conv = await conversation_repo.get_by_id(conversation_id)
    if not conv or conv.project_id != context.project_id:
        raise NotFoundError("Conversation not found")

    # Enforce tenant isolation
    if conv.created_by != context.user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this conversation",
        )

    messages = [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=[
                CitationResponse(
                    upload_id=c.upload_id,
                    filename=c.filename,
                    chunk_id=c.chunk_id,
                    content=c.content,
                    position=c.position,
                    score=c.score,
                )
                for c in m.citations
            ],
            created_at=m.created_at,
        )
        for m in conv.messages
    ]

    return ConversationDetailResponse(
        id=conv.id,
        project_id=conv.project_id,
        title=conv.title,
        created_at=conv.created_at,
        messages=messages,
    )


@router.delete(
    "/{project_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    context: Annotated[ProjectContext, Depends(require_project_role(Role.MEMBER))],
    conversation_repo: Annotated[ConversationRepository, Depends(get_conversation_repository)],
) -> None:
    """Delete a conversation session."""
    conv = await conversation_repo.get_by_id(conversation_id)
    if not conv or conv.project_id != context.project_id:
        raise NotFoundError("Conversation not found")

    # Enforce ownership check
    if conv.created_by != context.user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this conversation",
        )

    await conversation_repo.delete(conversation_id)
    await conversation_repo.commit()
