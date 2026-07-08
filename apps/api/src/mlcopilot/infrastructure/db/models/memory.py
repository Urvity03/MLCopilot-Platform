"""SQLAlchemy models for Project Memory aggregates."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from mlcopilot.infrastructure.db.base import Base
from mlcopilot.infrastructure.db.models.mixins import UUIDMixin


class MemoryRecord(UUIDMixin, Base):
    """SQLAlchemy model for memory records."""

    __tablename__ = "memory_records"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", name="fk_memory_records_project_id_projects", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    source_event: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    # Relationships
    links: Mapped[list[MemoryLink]] = relationship(
        "MemoryLink",
        back_populates="record",
        cascade="all, delete-orphan",
    )


class MemoryLink(Base):
    """SQLAlchemy model for memory links relating records to artifacts."""

    __tablename__ = "memory_links"

    memory_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "memory_records.id",
            name="fk_memory_links_memory_record_id_memory_records",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    artifact_type: Mapped[str] = mapped_column(String(100), primary_key=True)
    artifact_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)

    # Relationships
    record: Mapped[MemoryRecord] = relationship("MemoryRecord", back_populates="links")

    __table_args__ = (
        Index("memory_links_artifact_idx", "artifact_type", "artifact_id"),
    )
