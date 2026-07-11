"""Pydantic schemas for the uploads API."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class UploadResponse(BaseModel):
    """Response model for an upload aggregate."""

    id: uuid.UUID
    project_id: uuid.UUID
    kind: str
    filename: str
    storage_uri: str
    parse_status: str
    embedding_status: str
    metadata: dict[str, Any]
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
