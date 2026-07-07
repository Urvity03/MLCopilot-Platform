import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from mlcopilot.infrastructure.db.base import Base
from mlcopilot.infrastructure.db.models.mixins import TimestampMixin, UUIDMixin


class ApiKey(UUIDMixin, TimestampMixin, Base):
    """ApiKey model representing a user's API Key for SDK/CLI/CI programmatic access."""
    __tablename__ = "api_keys"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    prefix: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
    )
    key_hash: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    scopes: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
