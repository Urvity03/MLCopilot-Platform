from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from mlcopilot.infrastructure.db.base import Base

if TYPE_CHECKING:
    from mlcopilot.infrastructure.db.models.embedding import ChunkEmbeddingModel


class UploadModel(Base):
    """ORM model for the uploads table."""

    __tablename__ = "uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    parse_status: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('notebook', 'paper')", name="uploads_kind_check"
        ),
        CheckConstraint(
            "parse_status IN ('pending', 'parsing', 'parsed', 'failed')",
            name="uploads_parse_status_check",
        ),
        CheckConstraint(
            "embedding_status IN ('pending', 'embedding', 'embedded', 'failed')",
            name="uploads_embedding_status_check",
        ),
    )


class ParsedChunkModel(Base):
    """ORM model for the parsed_chunks table."""

    __tablename__ = "parsed_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    # Relationships
    embedding_rel: Mapped[ChunkEmbeddingModel | None] = relationship(
        "ChunkEmbeddingModel",
        back_populates="chunk",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("upload_id", "position", name="uq_parsed_chunks_upload_position"),
    )
