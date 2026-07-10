"""Blob storage protocol for the uploads feature."""

from typing import BinaryIO, Protocol
from uuid import UUID


class BlobStorage(Protocol):
    """Protocol for abstracting object storage (e.g., MinIO/S3)."""

    async def put(
        self,
        project_id: UUID,
        upload_id: UUID,
        filename: str,
        data: BinaryIO,
        length: int,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file to storage and return its URI.

        Args:
            project_id: The ID of the project this upload belongs to.
            upload_id: The unique ID of the upload aggregate.
            filename: The original filename.
            data: A binary stream containing the file data.
            length: The size of the file in bytes.
            content_type: The MIME type of the file.

        Returns:
            The generated storage URI (e.g. s3://bucket/path/to/file).
        """
        ...

    async def get(
        self,
        project_id: UUID,
        upload_id: UUID,
        filename: str,
    ) -> bytes:
        """Download a file from storage and return its raw bytes.

        Args:
            project_id: The ID of the project this upload belongs to.
            upload_id: The unique ID of the upload aggregate.
            filename: The original filename.

        Returns:
            The raw bytes of the file.
        """
        ...
