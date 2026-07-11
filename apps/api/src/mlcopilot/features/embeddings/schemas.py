"""Pydantic schemas for semantic search request/response validation."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Payload to query project documents using semantic search."""

    query: str = Field(..., min_length=1, max_length=2048)
    top_k: int = Field(default=5, ge=1, le=100)


class SearchResponseItem(BaseModel):
    """A ranked search result item."""

    upload_id: UUID
    chunk_id: UUID
    score: float
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Complete ranked results for a semantic search query."""

    results: list[SearchResponseItem]
