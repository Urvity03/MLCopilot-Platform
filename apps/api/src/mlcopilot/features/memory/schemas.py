"""Pydantic schemas for memory record serialization."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ArtifactRefResponse(BaseModel):
    """Serialization representation of a link/related artifact."""

    model_config = ConfigDict(from_attributes=True)

    artifact_type: str
    artifact_id: UUID


class MemoryRecordResponse(BaseModel):
    """Serialization representation of a memory record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    kind: str = Field(..., pattern="^(fact|decision|failure|insight)$")
    content: str
    source_event: dict[str, Any] | None
    created_at: datetime
    links: list[ArtifactRefResponse]


class MemoryPageResponse(BaseModel):
    """Serialization representation of a paginated memory record collection."""

    items: list[MemoryRecordResponse]
    next_cursor: str | None
