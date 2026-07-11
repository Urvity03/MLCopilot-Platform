"""Domain aggregates representing uploads (notebooks and papers)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any, Protocol


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


class UploadEmbeddingStatus(StrEnum):
    """The embedding state machine for an upload."""

    PENDING = "pending"
    EMBEDDING = "embedding"
    EMBEDDED = "embedded"
    FAILED = "failed"


@dataclass(frozen=True)
class ParsedChunk:
    """A parsed chunk from an uploaded document."""

    id: uuid.UUID
    upload_id: uuid.UUID
    position: int
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ExtractedChunk:
    """A raw chunk extracted from a document by a parser."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentParser(Protocol):
    """Protocol for extracting text and chunking files in various formats."""

    def parse(self, data: bytes) -> list[ExtractedChunk]:
        """Parse raw document bytes and return a list of extracted chunks."""
        ...


@dataclass
class Upload:
    """Upload aggregate root for knowledge base artifacts."""

    id: uuid.UUID
    project_id: uuid.UUID
    kind: UploadKind
    filename: str
    storage_uri: str
    parse_status: UploadParseStatus
    embedding_status: UploadEmbeddingStatus
    metadata: dict[str, Any]
    uploaded_by: uuid.UUID
    created_at: datetime
