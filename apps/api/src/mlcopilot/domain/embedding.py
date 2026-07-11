"""Domain entities and protocols for vector embeddings and search."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol


@dataclass(frozen=True)
class Embedding:
    """Domain model representing a chunk vector embedding."""

    id: uuid.UUID
    chunk_id: uuid.UUID
    model_name: str
    dimension: int
    embedding: list[float]
    created_at: datetime


@dataclass(frozen=True)
class SearchResult:
    """Domain representation of a ranked semantic search result."""

    upload_id: uuid.UUID
    chunk_id: uuid.UUID
    score: float
    content: str
    metadata: dict[str, Any]


class EmbeddingProvider(Protocol):
    """Protocol for abstracting embedding model generators (local or API)."""

    async def embed(self, text: str) -> list[float]:
        """Compute the embedding vector for a single text chunk."""
        ...

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Compute embedding vectors in batch for multiple text chunks."""
        ...


class EmbeddingRepository(Protocol):
    """Protocol for vector storage, deletion, and similarity queries."""

    async def add(self, embedding: Embedding) -> None:
        """Persist a single chunk vector embedding."""
        ...

    async def add_many(self, items: list[Embedding]) -> None:
        """Persist multiple chunk vector embeddings in batch."""
        ...

    async def delete_upload(self, upload_id: uuid.UUID) -> None:
        """Remove all vector embeddings belonging to a specific upload."""
        ...

    async def search(
        self,
        project_id: uuid.UUID,
        query_vector: list[float],
        top_k: int,
    ) -> list[SearchResult]:
        """Execute project-isolated cosine similarity query."""
        ...

    async def exists(self, chunk_id: uuid.UUID) -> bool:
        """Check if an embedding exists for a specific chunk ID."""
        ...

    async def count(self) -> int:
        """Get total number of embeddings persisted in the system."""
        ...
