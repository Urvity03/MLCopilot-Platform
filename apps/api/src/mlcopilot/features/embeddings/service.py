"""Application service managing document vector generation and semantic search."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from mlcopilot.domain.embedding import Embedding, SearchResult
from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.upload import UploadEmbeddingStatus, UploadParseStatus
from mlcopilot.infrastructure.db.repositories.embedding import PostgresEmbeddingRepository
from mlcopilot.infrastructure.db.repositories.upload import SqlAlchemyUploadRepository

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from mlcopilot.domain.embedding import EmbeddingProvider


class EmbeddingService:
    """Service orchestrating document embedding pipelines and similarity searches."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None,
        provider: EmbeddingProvider,
        model_name: str,
        dimension: int,
    ) -> None:
        self._session_factory = session_factory
        self._provider = provider
        self.model_name = model_name
        self.dimension = dimension

    async def generate_embeddings_for_upload(self, upload_id: uuid.UUID) -> None:
        """Fetch parsed chunks, compute embeddings in batch, and update lifecycle status."""
        if not self._session_factory:
            msg = "Database session factory is not configured on the service."
            raise RuntimeError(msg)

        async with self._session_factory() as session:
            upload_repo = SqlAlchemyUploadRepository(session)

            upload = await upload_repo.get_by_id(upload_id)
            if not upload:
                msg = f"Upload {upload_id} not found."
                raise NotFoundError(msg)

            if upload.parse_status != UploadParseStatus.PARSED:
                # Do not generate embeddings for failed or unparsed files
                return

            # 1. Update embedding status to EMBEDDING
            upload.embedding_status = UploadEmbeddingStatus.EMBEDDING
            await upload_repo.update(upload)
            await session.commit()

        # 2. Compute and persist vector embeddings
        async with self._session_factory() as session:
            upload_repo = SqlAlchemyUploadRepository(session)
            embedding_repo = PostgresEmbeddingRepository(session)

            upload = await upload_repo.get_by_id(upload_id)
            if not upload:
                return

            try:
                chunks = await upload_repo.get_chunks(upload_id)

                # Avoid duplicate generation: filter for chunks lacking embeddings
                chunks_to_embed = []
                for chunk in chunks:
                    exists = await embedding_repo.exists(chunk.id)
                    if not exists:
                        chunks_to_embed.append(chunk)

                if chunks_to_embed:
                    texts = [chunk.content for chunk in chunks_to_embed]
                    # Batched inference
                    vectors = await self._provider.embed_many(texts)

                    embeddings = [
                        Embedding(
                            id=uuid.uuid4(),
                            chunk_id=chunk.id,
                            model_name=self.model_name,
                            dimension=self.dimension,
                            embedding=vector,
                            created_at=datetime.now(UTC),
                        )
                        for chunk, vector in zip(chunks_to_embed, vectors, strict=True)
                    ]
                    await embedding_repo.add_many(embeddings)

                # Complete lifecycle transition
                upload.embedding_status = UploadEmbeddingStatus.EMBEDDED
                await upload_repo.update(upload)
                await session.commit()

            except Exception as e:
                await session.rollback()

                # Mark status as failed in a clean transaction
                async with self._session_factory() as fail_session:
                    fail_upload_repo = SqlAlchemyUploadRepository(fail_session)
                    fail_upload = await fail_upload_repo.get_by_id(upload_id)
                    if fail_upload:
                        fail_upload.embedding_status = UploadEmbeddingStatus.FAILED
                        fail_upload.metadata = {
                            **fail_upload.metadata,
                            "embedding_error": str(e),
                        }
                        await fail_upload_repo.update(fail_upload)
                        await fail_session.commit()
                raise

    async def search(
        self,
        project_id: uuid.UUID,
        query: str,
        top_k: int,
        session: AsyncSession,
    ) -> list[SearchResult]:
        """Perform project-isolated semantic similarity query."""
        query_vector = await self._provider.embed(query)
        embedding_repo = PostgresEmbeddingRepository(session)
        return await embedding_repo.search(
            project_id=project_id,
            query_vector=query_vector,
            top_k=top_k,
        )
