"""Repository protocol for uploads."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from mlcopilot.domain.upload import ParsedChunk, Upload


class UploadRepository(Protocol):
    """Protocol for upload aggregate persistence."""

    async def get_by_id(self, upload_id: UUID) -> Upload | None:
        """Retrieve an upload by its unique ID."""
        ...

    async def list_by_project(
        self, project_id: UUID, limit: int = 50
    ) -> list[Upload]:
        """List uploads in a project."""
        ...

    async def add(self, upload: Upload) -> None:
        """Persist a new upload aggregate."""
        ...

    async def update(self, upload: Upload) -> None:
        """Update an existing upload's status and metadata."""
        ...

    async def add_chunks(self, upload_id: UUID, chunks: list[ParsedChunk]) -> None:
        """Bulk insert parsed chunks for an upload."""
        ...

    async def get_chunks(self, upload_id: UUID) -> list[ParsedChunk]:
        """Retrieve parsed chunks for an upload."""
        ...

    async def commit(self) -> None:
        """Commit the current persistence transaction."""
        ...
