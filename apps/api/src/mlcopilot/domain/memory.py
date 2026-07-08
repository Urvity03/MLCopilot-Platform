"""Domain models and value objects for Project Memory."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any


class MemoryKind(StrEnum):
    """Kinds of memory records (docs/architecture/17-memory.md)."""

    FACT = "fact"
    DECISION = "decision"
    FAILURE = "failure"
    INSIGHT = "insight"


@dataclass(frozen=True)
class ArtifactRef:
    """Typed reference to a source/related artifact."""

    artifact_type: str
    artifact_id: uuid.UUID


@dataclass
class MemoryRecord:
    """Immutable aggregate root representing a piece of project knowledge."""

    id: uuid.UUID
    project_id: uuid.UUID
    kind: MemoryKind
    content: str
    source_event: dict[str, Any] | None
    created_at: datetime
    links: list[ArtifactRef]

    def __post_init__(self) -> None:
        if not self.links:
            raise ValueError("MemoryRecord must reference at least one source artifact.")


@dataclass(frozen=True)
class MemoryPage:
    """Paginated collection of memory records with opaque cursor."""

    items: list[MemoryRecord]
    next_cursor: str | None
