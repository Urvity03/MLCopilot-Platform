"""Domain aggregates representing uploads (notebooks and papers)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class UploadKind(StrEnum):
    """The kind of the uploaded artifact."""

    NOTEBOOK = "notebook"
    PAPER = "paper"


class UploadParseStatus(StrEnum):
    """The parsing state machine for an upload."""

    PENDING = "pending"
    PARSING = "parsing"
    PARSED = "parsed"
    FAILED = "failed"


@dataclass(frozen=True)
class ParsedChunk:
    """A parsed chunk from an uploaded document."""

    id: uuid.UUID
    upload_id: uuid.UUID
    position: int
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Upload:
    """Upload aggregate root for knowledge base artifacts."""

    id: uuid.UUID
    project_id: uuid.UUID
    kind: UploadKind
    filename: str
    storage_uri: str
    parse_status: UploadParseStatus
    metadata: dict[str, Any]
    uploaded_by: uuid.UUID
    created_at: datetime
