"""Repository protocols for Project Memory."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from mlcopilot.domain.memory import MemoryKind, MemoryRecord


class MemoryRepository(Protocol):
    """Protocol for Project Memory aggregate persistence."""

    async def add(self, record: MemoryRecord) -> None:
        """Persist a new memory record aggregate and its links."""
        ...

    async def get_by_id(self, project_id: UUID, record_id: UUID) -> MemoryRecord | None:
        """Retrieve a specific memory record by its ID, scoped to a project."""
        ...

    async def list_paginated(
        self,
        *,
        project_id: UUID,
        kind: MemoryKind | None,
        limit: int,
        cursor_created_at: datetime | None,
        cursor_id: UUID | None,
    ) -> list[MemoryRecord]:
        """Query memory records chronologically.

        Sorts by created_at DESC, id DESC, with paging and kind filters.
        """
        ...
