"""SQLAlchemy implementation of the MemoryRepository protocol."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from mlcopilot.domain.memory import ArtifactRef, MemoryKind, MemoryRecord
from mlcopilot.infrastructure.db.models.memory import (
    MemoryLink as DbMemoryLink,
)
from mlcopilot.infrastructure.db.models.memory import (
    MemoryRecord as DbMemoryRecord,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyMemoryRepository:
    """SQLAlchemy implementation of the MemoryRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_rec: DbMemoryRecord) -> MemoryRecord:
        return MemoryRecord(
            id=db_rec.id,
            project_id=db_rec.project_id,
            kind=MemoryKind(db_rec.kind),
            content=db_rec.content,
            source_event=db_rec.source_event,
            created_at=db_rec.created_at,
            links=[
                ArtifactRef(
                    artifact_type=link.artifact_type,
                    artifact_id=link.artifact_id,
                )
                for link in db_rec.links
            ],
        )

    async def add(self, record: MemoryRecord) -> None:
        """Persist a new memory record and its links."""
        db_rec = DbMemoryRecord(
            id=record.id,
            project_id=record.project_id,
            kind=record.kind.value,
            content=record.content,
            source_event=record.source_event,
            created_at=record.created_at,
        )
        db_rec.links = [
            DbMemoryLink(
                memory_record_id=record.id,
                artifact_type=link.artifact_type,
                artifact_id=link.artifact_id,
            )
            for link in record.links
        ]
        self._session.add(db_rec)
        await self._session.flush()

    async def get_by_id(self, project_id: UUID, record_id: UUID) -> MemoryRecord | None:
        """Retrieve a specific memory record by ID."""
        stmt = (
            select(DbMemoryRecord)
            .options(selectinload(DbMemoryRecord.links))
            .where(
                and_(
                    DbMemoryRecord.id == record_id,
                    DbMemoryRecord.project_id == project_id,
                )
            )
        )
        result = await self._session.execute(stmt)
        db_rec = result.scalar_one_or_none()
        if not db_rec:
            return None
        return self._to_domain(db_rec)

    async def list_paginated(
        self,
        *,
        project_id: UUID,
        kind: MemoryKind | None,
        limit: int,
        cursor_created_at: datetime | None,
        cursor_id: UUID | None,
    ) -> list[MemoryRecord]:
        """List memory records with sorting and optional cursor filtering."""
        stmt = (
            select(DbMemoryRecord)
            .options(selectinload(DbMemoryRecord.links))
            .where(DbMemoryRecord.project_id == project_id)
        )

        if kind:
            stmt = stmt.where(DbMemoryRecord.kind == kind.value)

        # Apply cursor bounds (created_at DESC, id DESC)
        if cursor_created_at and cursor_id:
            stmt = stmt.where(
                or_(
                    DbMemoryRecord.created_at < cursor_created_at,
                    and_(
                        DbMemoryRecord.created_at == cursor_created_at,
                        DbMemoryRecord.id < cursor_id,
                    ),
                )
            )

        stmt = stmt.order_by(
            DbMemoryRecord.created_at.desc(), DbMemoryRecord.id.desc()
        ).limit(limit)

        result = await self._session.execute(stmt)
        return [self._to_domain(db_rec) for db_rec in result.scalars().all()]
