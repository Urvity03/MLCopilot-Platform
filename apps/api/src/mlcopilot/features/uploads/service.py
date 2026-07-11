"""Orchestration service layer for uploads."""

from __future__ import annotations

import json
import os
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, BinaryIO

from mlcopilot.domain.errors import UnprocessableError
from mlcopilot.domain.upload import (
    ParsedChunk,
    Upload,
    UploadEmbeddingStatus,
    UploadKind,
    UploadParseStatus,
)
from mlcopilot.infrastructure.parsers.registry import get_parser_for_extension

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

    def _determine_length(self, data: BinaryIO) -> int:
        """Seek data to determine its length in bytes, resetting cursor position."""
        data.seek(0, os.SEEK_END)
        length = data.tell()
        data.seek(0)
        return length

    def _validate_and_determine_kind(
        self, filename: str, length: int, data: BinaryIO
    ) -> UploadKind:
        """Inspect file extension and size to return target upload kind."""
        max_size = 50 * 1024 * 1024  # 50MB
        if length > max_size:
            msg = "File exceeds the maximum allowable size of 50MB."
            raise UnprocessableError(msg)

        _, ext = os.path.splitext(filename.lower())
        if ext == ".pdf":
            magic = data.read(4)
            data.seek(0)
            if magic != b"%PDF":
                msg = "Invalid PDF format: incorrect magic bytes"
                raise UnprocessableError(msg)
            kind = UploadKind.PAPER
        elif ext == ".docx":
            magic = data.read(4)
            data.seek(0)
            if magic != b"PK\x03\x04":
                msg = "Invalid DOCX format: incorrect magic bytes"
                raise UnprocessableError(msg)
            kind = UploadKind.PAPER
        elif ext in {".md", ".txt"}:
            kind = UploadKind.PAPER
        elif ext == ".ipynb":
            try:
                content = data.read().decode("utf-8")
                nb = json.loads(content)
                data.seek(0)
                if not isinstance(nb, dict) or "nbformat" not in nb:
                    msg = "Invalid Jupyter Notebook: missing nbformat attribute"
                    raise UnprocessableError(msg)
            except Exception as e:
                if isinstance(e, UnprocessableError):
                    raise
                msg = "Invalid Jupyter Notebook: file is not valid JSON"
                raise UnprocessableError(msg) from e
            kind = UploadKind.NOTEBOOK
        else:
            msg = (
                "Unsupported file extension. "
                "Allowed extensions are: .pdf, .docx, .md, .txt, and .ipynb."
            )
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
        """Ingest new document, parse, chunk, and update state."""
        length = self._determine_length(data)
        kind = self._validate_and_determine_kind(filename, length, data)

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
            embedding_status=UploadEmbeddingStatus.PENDING,
            metadata={},
            uploaded_by=uploaded_by,
            created_at=now,
        )

        await self._uploads.add(upload)

        # Synchronous document parsing and chunking workflow for PAPER kinds
        # (PDF, DOCX, Markdown, Text)
        # Notebooks (.ipynb) are skipped for this sprint's parsing pipeline
        if kind == UploadKind.PAPER:
            upload.parse_status = UploadParseStatus.PARSING
            await self._uploads.update(upload)

            try:
                _, ext = os.path.splitext(filename.lower())
                parser = get_parser_for_extension(ext)

                # Fetch raw file bytes from storage
                file_bytes = await self._storage.get(project_id, upload_id, filename)

                # Parse and chunk
                extracted_chunks = parser.parse(file_bytes)

                # Map extracted chunks to domain ParsedChunk entities
                parsed_chunks = [
                    ParsedChunk(
                        id=uuid.uuid4(),
                        upload_id=upload_id,
                        position=idx + 1,
                        content=chunk.content,
                        metadata=chunk.metadata,
                    )
                    for idx, chunk in enumerate(extracted_chunks)
                ]

                # Bulk insert chunks
                if parsed_chunks:
                    await self._uploads.add_chunks(upload_id, parsed_chunks)

                upload.parse_status = UploadParseStatus.PARSED
                upload.metadata = {**upload.metadata, "chunk_count": len(parsed_chunks)}
                await self._uploads.update(upload)

            except Exception as e:
                from mlcopilot.core.logging import get_logger
                logger = get_logger("mlcopilot.features.uploads.service")
                logger.error("upload.parsing.failed", upload_id=upload_id, error=str(e))

                upload.parse_status = UploadParseStatus.FAILED
                upload.metadata = {**upload.metadata, "error": str(e)}
                await self._uploads.update(upload)

        await self._uploads.commit()
        return upload

    async def list_project_uploads(self, *, project_id: uuid.UUID) -> list[Upload]:
        """List uploads belonging to a specific project."""
        return await self._uploads.list_by_project(project_id)

    async def get_upload(self, *, upload_id: uuid.UUID) -> Upload | None:
        """Retrieve a specific upload by its ID."""
        return await self._uploads.get_by_id(upload_id)
