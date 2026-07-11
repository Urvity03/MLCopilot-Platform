"""SQLAlchemy ORM model for chunk embeddings."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from mlcopilot.infrastructure.db.base import Base

if TYPE_CHECKING:
    from mlcopilot.infrastructure.db.models.upload import ParsedChunkModel


class ChunkEmbeddingModel(Base):
    """ORM model for the chunk_embeddings table."""

    __tablename__ = "chunk_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    chunk_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("parsed_chunks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    dimension: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    # Relationships
    chunk: Mapped[ParsedChunkModel] = relationship(
        "ParsedChunkModel", back_populates="embedding_rel"
    )
