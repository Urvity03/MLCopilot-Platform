from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class User:
    """User domain entity."""

    id: UUID
    email: str
    password_hash: str | None
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    avatar_url: str | None = None
    last_login: datetime | None = None
