"""Repository protocol for uploads."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from mlcopilot.domain.upload import Upload


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
