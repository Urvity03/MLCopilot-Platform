from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class ApiKey:
    """ApiKey domain entity for programmatic access credentials."""

    id: UUID
    user_id: UUID
    name: str
    prefix: str
    key_hash: str
    scopes: list[str]
    revoked_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime
    updated_at: datetime
