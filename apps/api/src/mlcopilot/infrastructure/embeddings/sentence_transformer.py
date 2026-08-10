"""Sentence Transformers implementation of the EmbeddingProvider protocol."""

from __future__ import annotations

import hashlib
import math
from anyio import to_thread

from mlcopilot.core.logging import get_logger
from mlcopilot.domain.embedding import EmbeddingProvider

logger = get_logger("mlcopilot.infrastructure.embeddings.sentence_transformer")

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    SentenceTransformer = None  # type: ignore[assignment, misc]
    HAS_SENTENCE_TRANSFORMERS = False


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """Vector embedding generator powered by sentence-transformers or deterministic hash fallback."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dimension: int = 384) -> None:
        self.model_name = model_name
        self.dimension = dimension
        self._model: SentenceTransformer | None = None
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                self._get_model()
            except Exception:
                logger.warning("embedding.sentence_transformers_init_deferred")

    def _get_model(self) -> SentenceTransformer:
        if self._model is not None:
            return self._model

        if not HAS_SENTENCE_TRANSFORMERS:
            raise RuntimeError("sentence-transformers package is not installed.")

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
                f"Offline error: {e_offline}, Online error: {e_online}."
            )
            logger.error("embedding.model_init_failed", error=msg)
            raise RuntimeError(msg) from e_online

    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for a single string chunk in a threadpool."""
        return await to_thread.run_sync(self._embed_sync, text)

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of string chunks in a threadpool."""
        return await to_thread.run_sync(self._embed_many_sync, texts)

    def _generate_fallback_vector(self, text: str) -> list[float]:
        """Deterministic 384-d normalized vector generator when local PyTorch is absent."""
        h = hashlib.sha256(text.encode('utf-8')).digest()
        vec = []
        for i in range(self.dimension):
            byte_val = h[i % len(h)]
            val = (byte_val / 255.0) * 2.0 - 1.0
            vec.append(val)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 6) for x in vec]

    def _embed_sync(self, text: str) -> list[float]:
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                model = self._get_model()
                vector = model.encode(text, convert_to_numpy=True)
                return [float(x) for x in vector.tolist()]
            except Exception as e:
                logger.warning("embedding.sentence_transformers_failed_using_fallback", error=str(e))
        return self._generate_fallback_vector(text)

    def _embed_many_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                model = self._get_model()
                vectors = model.encode(texts, convert_to_numpy=True)
                return [[float(x) for x in row] for row in vectors.tolist()]
            except Exception as e:
                logger.warning("embedding.sentence_transformers_failed_using_fallback", error=str(e))
        return [self._generate_fallback_vector(t) for t in texts]
