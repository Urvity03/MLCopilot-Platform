"""Sentence Transformers implementation of the EmbeddingProvider protocol."""

from __future__ import annotations

from anyio import to_thread
from sentence_transformers import SentenceTransformer

from mlcopilot.domain.embedding import EmbeddingProvider


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """Local vector embedding generator powered by sentence-transformers with instant fallback."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model = None
        self._failed_init = False
        try:
            self._model = SentenceTransformer(model_name, local_files_only=True)
        except Exception:
            pass

    def _get_model(self):
        if self._failed_init:
            return None
        if self._model is None:
            try:
                self._model = SentenceTransformer(self.model_name, local_files_only=True)
            except Exception:
                try:
                    self._model = SentenceTransformer(self.model_name)
                except Exception:
                    self._failed_init = True
                    return None
        return self._model



    def _fallback_vector(self, text: str) -> list[float]:
        import hashlib
        h = hashlib.sha256(text.encode('utf-8')).digest()
        vec = []
        for i in range(384):
            val = ((h[i % len(h)] + i * 17) % 256) / 256.0 - 0.5
            vec.append(val)
        return vec

    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for a single string chunk in a threadpool."""
        return await to_thread.run_sync(self._embed_sync, text)

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a batch of string chunks in a threadpool."""
        return await to_thread.run_sync(self._embed_many_sync, texts)

    def _embed_sync(self, text: str) -> list[float]:
        model = self._get_model()
        if model is not None:
            try:
                vector = model.encode(text, convert_to_numpy=True)
                return [float(x) for x in vector.tolist()]
            except Exception:
                pass
        return self._fallback_vector(text)

    def _embed_many_sync(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._get_model()
        if model is not None:
            try:
                vectors = model.encode(texts, convert_to_numpy=True)
                return [[float(x) for x in row] for row in vectors.tolist()]
            except Exception:
                pass
        return [self._fallback_vector(t) for t in texts]

