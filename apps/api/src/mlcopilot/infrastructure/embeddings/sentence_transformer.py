"""Sentence Transformers implementation of the EmbeddingProvider protocol."""

from __future__ import annotations

from anyio import to_thread
from sentence_transformers import SentenceTransformer

from mlcopilot.core.logging import get_logger
from mlcopilot.domain.embedding import EmbeddingProvider

logger = get_logger("mlcopilot.infrastructure.embeddings.sentence_transformer")


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """Local vector embedding generator powered by sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model: SentenceTransformer | None = None
        self._get_model()

    def _get_model(self) -> SentenceTransformer:
        if self._model is not None:
            return self._model

        # 1. Try local files first (offline cache)
        try:
            self._model = SentenceTransformer(self.model_name, local_files_only=True)
            logger.info("embedding.model_loaded_offline", model=self.model_name)
            return self._model
        except Exception as e_offline:
            logger.info(
                "embedding.model_offline_load_failed_attempting_download",
                model=self.model_name,
                details=str(e_offline),
            )

        # 2. Attempt online download/cache if local_files_only fails
        try:
            self._model = SentenceTransformer(self.model_name)
            logger.info("embedding.model_downloaded_and_loaded", model=self.model_name)
            return self._model
        except Exception as e_online:
            msg = (
                f"Failed to load SentenceTransformer model '{self.model_name}'. "
                f"Offline error: {e_offline}, Online error: {e_online}. "
                "Semantic retrieval cannot operate without valid vector embeddings."
            )
            logger.error("embedding.model_init_failed", error=msg)
            raise RuntimeError(msg) from e_online

    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for a single string chunk in a threadpool."""
        return await to_thread.run_sync(self._embed_sync, text)

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of string chunks in a threadpool."""
        return await to_thread.run_sync(self._embed_many_sync, texts)

    def _embed_sync(self, text: str) -> list[float]:
        model = self._get_model()
        vector = model.encode(text, convert_to_numpy=True)
        return [float(x) for x in vector.tolist()]

    def _embed_many_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._get_model()
        vectors = model.encode(texts, convert_to_numpy=True)
        return [[float(x) for x in row] for row in vectors.tolist()]


