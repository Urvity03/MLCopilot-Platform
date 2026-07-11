"""SQLAlchemy/PostgreSQL repository for managing chunk vector embeddings."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import delete, func, select

from mlcopilot.domain.embedding import Embedding, EmbeddingRepository, SearchResult
from mlcopilot.infrastructure.db.models.embedding import ChunkEmbeddingModel
from mlcopilot.infrastructure.db.models.upload import ParsedChunkModel, UploadModel

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class PostgresEmbeddingRepository(EmbeddingRepository):
    """PostgreSQL implementation of the EmbeddingRepository protocol using pgvector."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, embedding: Embedding) -> None:
        """Persist a single chunk vector embedding."""
        model = ChunkEmbeddingModel(
            id=embedding.id,
            chunk_id=embedding.chunk_id,
            model_name=embedding.model_name,
            dimension=embedding.dimension,
            embedding=embedding.embedding,
            created_at=embedding.created_at,
        )
        self._session.add(model)

    async def add_many(self, items: list[Embedding]) -> None:
        """Persist multiple chunk vector embeddings in batch."""
        models = [
            ChunkEmbeddingModel(
                id=item.id,
                chunk_id=item.chunk_id,
                model_name=item.model_name,
                dimension=item.dimension,
                embedding=item.embedding,
                created_at=item.created_at,
            )
            for item in items
        ]
        self._session.add_all(models)

    async def delete_upload(self, upload_id: uuid.UUID) -> None:
        """Remove all vector embeddings belonging to a specific upload."""
        chunk_ids_subquery = (
            select(ParsedChunkModel.id)
            .where(ParsedChunkModel.upload_id == upload_id)
        )
        stmt = (
            delete(ChunkEmbeddingModel)
            .where(ChunkEmbeddingModel.chunk_id.in_(chunk_ids_subquery))
        )
        await self._session.execute(stmt)

    async def search(
        self,
        project_id: uuid.UUID,
        query_vector: list[float],
        top_k: int,
    ) -> list[SearchResult]:
        """Execute project-isolated cosine similarity query."""
        # Cosine distance in pgvector is <=> operator. Cosine similarity = 1 - cosine_distance.
        distance_expr = ChunkEmbeddingModel.embedding.cosine_distance(query_vector)
        stmt = (
            select(
                ParsedChunkModel.id.label("chunk_id"),
                ParsedChunkModel.upload_id.label("upload_id"),
                ParsedChunkModel.content.label("content"),
                ParsedChunkModel.metadata_.label("metadata"),
                UploadModel.filename.label("filename"),
                (1.0 - distance_expr).label("similarity"),
            )
            .join(ParsedChunkModel, ParsedChunkModel.id == ChunkEmbeddingModel.chunk_id)
            .join(UploadModel, UploadModel.id == ParsedChunkModel.upload_id)
            .where(UploadModel.project_id == project_id)
            .order_by(distance_expr.asc())
            .limit(top_k)
        )
        res = await self._session.execute(stmt)
        results = []
        for row in res.all():
            meta = dict(row.metadata or {})
            meta["filename"] = row.filename
            results.append(
                SearchResult(
                    upload_id=row.upload_id,
                    chunk_id=row.chunk_id,
                    score=float(row.similarity),
                    content=row.content,
                    metadata=meta,
                )
            )
        return results

    async def exists(self, chunk_id: uuid.UUID) -> bool:
        """Check if an embedding exists for a specific chunk ID."""
        stmt = select(1).where(ChunkEmbeddingModel.chunk_id == chunk_id).limit(1)
        res = await self._session.execute(stmt)
        return res.scalar() is not None

    async def count(self) -> int:
        """Get total number of embeddings persisted in the system."""
        stmt = select(func.count()).select_from(ChunkEmbeddingModel)
        res = await self._session.execute(stmt)
        return res.scalar() or 0
