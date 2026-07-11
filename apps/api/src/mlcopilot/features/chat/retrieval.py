"""Retrieval service for semantic chunk lookup."""

from __future__ import annotations

from typing import TYPE_CHECKING

from mlcopilot.domain.chat import RetrievedChunk

if TYPE_CHECKING:
    import uuid

    from mlcopilot.domain.embedding import EmbeddingProvider, EmbeddingRepository


class RetrievalService:
    """Service layer for computing question embeddings and running semantic retrieval."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        embedding_repo: EmbeddingRepository,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._embedding_repo = embedding_repo

    async def retrieve_relevant_chunks(
        self, project_id: uuid.UUID, question: str, top_k: int = 4
    ) -> list[RetrievedChunk]:
        """Embed the user's question, execute pgvector query, and return matching chunks."""
        # 1. Generate query embedding
        query_vector = await self._embedding_provider.embed(question)

        # 2. Run pgvector cosine similarity search
        search_results = await self._embedding_repo.search(
            project_id=project_id, query_vector=query_vector, top_k=top_k
        )

        # 3. Map search results to domain RetrievedChunks
        retrieved_chunks = []
        for res in search_results:
            filename = res.metadata.get("filename", "Unknown Document")
            position = res.metadata.get("position", 0)
            retrieved_chunks.append(
                RetrievedChunk(
                    chunk_id=res.chunk_id,
                    upload_id=res.upload_id,
                    filename=filename,
                    content=res.content,
                    position=position,
                    score=res.score,
                )
            )
        return retrieved_chunks
