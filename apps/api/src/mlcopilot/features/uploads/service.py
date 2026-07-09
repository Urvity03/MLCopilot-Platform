"""Orchestration service layer for uploads."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, BinaryIO

from mlcopilot.domain.errors import UnprocessableError
from mlcopilot.domain.upload import Upload, UploadKind, UploadParseStatus

if TYPE_CHECKING:
    from mlcopilot.features.uploads.repository import UploadRepository
    from mlcopilot.features.uploads.storage import BlobStorage


class UploadService:
    """Service to orchestrate file uploads and knowledge base ingestion."""

    def __init__(
        self,
        upload_repo: UploadRepository,
        blob_storage: BlobStorage,
    ) -> None:
        self._uploads = upload_repo
        self._storage = blob_storage

    def _validate_and_determine_kind(self, filename: str, data: BinaryIO) -> UploadKind:
        """Validate magic bytes and determine upload kind."""
        data.seek(0)

        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf"):
            magic = data.read(4)
            if magic != b"%PDF":
                msg = "Invalid PDF format: incorrect magic bytes"
                raise UnprocessableError(msg)
            kind = UploadKind.PAPER
        elif filename_lower.endswith(".ipynb"):
            try:
                content = data.read().decode("utf-8")
                nb = json.loads(content)
                if not isinstance(nb, dict) or "nbformat" not in nb:
                    msg = "Invalid Jupyter Notebook: missing nbformat attribute"
                    raise UnprocessableError(msg)
            except UnprocessableError:
                raise
            except Exception as e:
                msg = "Invalid Jupyter Notebook: file is not valid JSON"
                raise UnprocessableError(msg) from e
            kind = UploadKind.NOTEBOOK
        else:
            msg = "Unsupported file extension. Only .pdf and .ipynb are allowed."
            raise UnprocessableError(msg)

        return kind

    async def create_upload(
        self,
        *,
        project_id: uuid.UUID,
        filename: str,
        data: BinaryIO,
        content_type: str,
        uploaded_by: uuid.UUID,
    ) -> Upload:
        """Validate, upload to blob storage, and create the aggregate."""
        kind = self._validate_and_determine_kind(filename, data)

        # Calculate file length
        data.seek(0, 2)
        length = data.tell()

        # Reset pointer for storage upload
        data.seek(0)

        upload_id = uuid.uuid4()
        now = datetime.now(UTC)

        storage_uri = await self._storage.put(
            project_id=project_id,
            upload_id=upload_id,
            filename=filename,
            data=data,
            length=length,
            content_type=content_type,
        )

        upload = Upload(
            id=upload_id,
            project_id=project_id,
            kind=kind,
            filename=filename,
            storage_uri=storage_uri,
            parse_status=UploadParseStatus.PENDING,
            metadata={},
            uploaded_by=uploaded_by,
            created_at=now,
        )

        await self._uploads.add(upload)

        # Note: Event firing (e.g. NotebookUploaded, PaperUploaded) would occur here,
        # but is omitted as there is no central EventBus in the current architecture.
        # Future asynchronous parsers will likely poll the 'pending' status or consume events.

        return upload

    async def list_project_uploads(self, *, project_id: uuid.UUID) -> list[Upload]:
        """List uploads belonging to a specific project."""
        return await self._uploads.list_by_project(project_id)

    async def get_upload(self, *, upload_id: uuid.UUID) -> Upload | None:
        """Retrieve a specific upload by its ID."""
        return await self._uploads.get_by_id(upload_id)
