"""MinIO implementation of the BlobStorage protocol."""

from typing import BinaryIO
from uuid import UUID

from anyio.to_thread import run_sync
from minio import Minio


class MinioBlobStorage:
    """MinIO-backed implementation of the BlobStorage protocol."""

    def __init__(self, client: Minio, bucket_name: str) -> None:
        self._client = client
        self._bucket_name = bucket_name

    async def put(
        self,
        project_id: UUID,
        upload_id: UUID,
        filename: str,
        data: BinaryIO,
        length: int,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file to MinIO and return its URI."""

        object_name = f"projects/{project_id}/uploads/{upload_id}/{filename}"

        # MinIO's put_object is blocking, so we run it in a thread pool.
        await run_sync(
            self._client.put_object,
            self._bucket_name,
            object_name,
            data,
            length,
            content_type,
        )

        return f"s3://{self._bucket_name}/{object_name}"

