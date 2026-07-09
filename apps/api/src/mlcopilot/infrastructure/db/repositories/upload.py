"""SQLAlchemy implementation of the UploadRepository protocol."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select

from mlcopilot.domain.upload import Upload as DomainUpload
from mlcopilot.domain.upload import UploadKind, UploadParseStatus
from mlcopilot.infrastructure.db.models.upload import UploadModel as DbUpload

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyUploadRepository:
    """SQLAlchemy implementation of the UploadRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, db_upload: DbUpload) -> DomainUpload:
        return DomainUpload(
            id=db_upload.id,
            project_id=db_upload.project_id,
            kind=UploadKind(db_upload.kind),
            filename=db_upload.filename,
            storage_uri=db_upload.storage_uri,
            parse_status=UploadParseStatus(db_upload.parse_status),
            metadata=db_upload.metadata_,
            uploaded_by=db_upload.uploaded_by,
            created_at=db_upload.created_at,
        )

    async def get_by_id(self, upload_id: UUID) -> DomainUpload | None:
        """Retrieve an upload by ID."""
        db_upload = await self._session.get(DbUpload, upload_id)
        if not db_upload:
            return None
        return self._to_domain(db_upload)

    async def list_by_project(
        self, project_id: UUID, limit: int = 50
    ) -> list[DomainUpload]:
        """List uploads in a project."""
        result = await self._session.execute(
            select(DbUpload)
            .where(DbUpload.project_id == project_id)
            .order_by(DbUpload.created_at.desc())
            .limit(limit)
        )
        return [self._to_domain(db_u) for db_u in result.scalars().all()]

    async def add(self, upload: DomainUpload) -> None:
        """Save a new upload."""
        db_upload = DbUpload(
            id=upload.id,
            project_id=upload.project_id,
            kind=upload.kind.value,
            filename=upload.filename,
            storage_uri=upload.storage_uri,
            parse_status=upload.parse_status.value,
            metadata_=upload.metadata,
            uploaded_by=upload.uploaded_by,
            created_at=upload.created_at,
        )
        self._session.add(db_upload)
        await self._session.flush()
