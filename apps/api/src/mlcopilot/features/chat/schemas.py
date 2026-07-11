"""Pydantic schemas for Chat and RAG API routes."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema representing chat API prompt request inputs."""

    question: str = Field(..., min_length=1, max_length=5000)
    conversation_id: uuid.UUID | None = None
    stream: bool = True


class CitationResponse(BaseModel):
    """Schema representing structured search reference citations."""

    upload_id: uuid.UUID
    filename: str
    chunk_id: uuid.UUID
    content: str
    position: int
    score: float


class ChatMessageResponse(BaseModel):
    """Schema representing a single message turn response payload."""

    id: uuid.UUID
    role: str
    content: str
    citations: list[CitationResponse]
    created_at: datetime


class ConversationResponse(BaseModel):
    """Schema representing overview conversation details."""

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    created_at: datetime


class ConversationDetailResponse(BaseModel):
    """Schema representing full detail conversation records with messages list."""

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    created_at: datetime
    messages: list[ChatMessageResponse]
