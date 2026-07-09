"""FastAPI dependencies for the uploads feature."""

from typing import Annotated

from fastapi import Depends
from minio import Minio
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.core.config import get_settings
from mlcopilot.features.uploads.repository import UploadRepository
from mlcopilot.features.uploads.service import UploadService
from mlcopilot.features.uploads.storage import BlobStorage
from mlcopilot.infrastructure.db.repositories.upload import SqlAlchemyUploadRepository
from mlcopilot.infrastructure.db.session import get_db_session
from mlcopilot.infrastructure.storage.minio import MinioBlobStorage


def get_blob_storage() -> BlobStorage:
    """Dependency to provide a configured BlobStorage client."""
    settings = get_settings()
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key.get_secret_value(),
        secure=settings.minio_secure,
    )
    return MinioBlobStorage(client=client, bucket_name=settings.minio_bucket)


async def get_upload_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UploadRepository:
    """Dependency to provide the UploadRepository."""
    return SqlAlchemyUploadRepository(session)


async def get_upload_service(
    upload_repo: Annotated[UploadRepository, Depends(get_upload_repository)],
    blob_storage: Annotated[BlobStorage, Depends(get_blob_storage)],
) -> UploadService:
    """Dependency to provide the UploadService."""
    return UploadService(upload_repo=upload_repo, blob_storage=blob_storage)
