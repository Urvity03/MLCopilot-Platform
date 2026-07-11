"""Sentence Transformers implementation of the EmbeddingProvider protocol."""

from __future__ import annotations

from anyio import to_thread
from sentence_transformers import SentenceTransformer

from mlcopilot.domain.embedding import EmbeddingProvider


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """Local vector embedding generator powered by sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        # Pre-loads and caches model weights locally
        self._model = SentenceTransformer(model_name)

    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for a single string chunk in a threadpool."""
        return await to_thread.run_sync(self._embed_sync, text)

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of string chunks in a threadpool."""
        return await to_thread.run_sync(self._embed_many_sync, texts)

    def _embed_sync(self, text: str) -> list[float]:
        vector = self._model.encode(text, convert_to_numpy=True)
        return [float(x) for x in vector.tolist()]

    def _embed_many_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self._model.encode(texts, convert_to_numpy=True)
        return [[float(x) for x in row] for row in vectors.tolist()]
