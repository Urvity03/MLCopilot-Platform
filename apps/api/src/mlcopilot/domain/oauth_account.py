from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class OAuthAccount:
    """OAuth provider account linked to a user."""

    id: UUID
    user_id: UUID
    provider: str  # "google" | "github"
    provider_account_id: str
    provider_email: str | None
    provider_name: str | None
    provider_avatar: str | None
    created_at: datetime
