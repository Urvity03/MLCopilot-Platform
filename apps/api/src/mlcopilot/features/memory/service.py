"""Orchestration service layer for Project Memory."""

from __future__ import annotations

import base64
import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from mlcopilot.domain.memory import (
    ArtifactRef,
    MemoryKind,
    MemoryPage,
    MemoryRecord,
)

if TYPE_CHECKING:
    from mlcopilot.features.memory.repository import MemoryRepository


def _encode_cursor(created_at: datetime, record_id: uuid.UUID) -> str:
    state = {
        "created_at": created_at.isoformat(),
        "id": str(record_id),
    }
    serialized = json.dumps(state)
    return base64.b64encode(serialized.encode("utf-8")).decode("utf-8")


def _decode_cursor(cursor_str: str) -> tuple[datetime, uuid.UUID] | None:
    try:
        decoded_bytes = base64.b64decode(cursor_str.encode("utf-8"))
        state = json.loads(decoded_bytes.decode("utf-8"))
        return datetime.fromisoformat(state["created_at"]), uuid.UUID(state["id"])
    except Exception:
        return None


class MemoryService:
    """Service to orchestrate memory creation and paginated queries."""

    def __init__(self, memory_repo: MemoryRepository) -> None:
        self._memory_repo = memory_repo

    async def create_record(
        self,
        *,
        project_id: uuid.UUID,
        kind: MemoryKind,
        content: str,
        source_event: dict[str, Any] | None = None,
        links: list[ArtifactRef],
    ) -> MemoryRecord:
        """Persist a new memory record aggregate.

        [Implementation Decision Justification]: This method provides a stable
        application-layer entry point for future asynchronous event-sourced
        projection consumers (determining facts/failures) and AI memory agents
        (distilling decisions/insights). It does not represent a documented
        architecture requirement for HTTP endpoints in this milestone.
        """
        record = MemoryRecord(
            id=uuid.uuid4(),
            project_id=project_id,
            kind=kind,
            content=content,
            source_event=source_event,
            created_at=datetime.now(UTC),
            links=links,
        )
        await self._memory_repo.add(record)
        return record

    async def get_record(
        self, *, project_id: uuid.UUID, record_id: uuid.UUID
    ) -> MemoryRecord | None:
        """Retrieve a specific memory record."""
        return await self._memory_repo.get_by_id(project_id, record_id)

    async def list_records(
        self,
        *,
        project_id: uuid.UUID,
        kind: MemoryKind | None = None,
        limit: int = 25,
        cursor: str | None = None,
    ) -> MemoryPage:
        """Query a page of chronological memory records with filtering."""
        cursor_created_at: datetime | None = None
        cursor_id: uuid.UUID | None = None

        if cursor:
            parsed = _decode_cursor(cursor)
            if parsed:
                cursor_created_at, cursor_id = parsed

        # Fetch limit + 1 records to check for a next page
        records = await self._memory_repo.list_paginated(
            project_id=project_id,
            kind=kind,
            limit=limit + 1,
            cursor_created_at=cursor_created_at,
            cursor_id=cursor_id,
        )

        has_more = len(records) > limit
        items = records[:limit]

        next_cursor = None
        if has_more and items:
            last_item = items[-1]
            next_cursor = _encode_cursor(last_item.created_at, last_item.id)

        return MemoryPage(items=items, next_cursor=next_cursor)
