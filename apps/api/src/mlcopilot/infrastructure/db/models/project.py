"""SQLAlchemy model mappings for projects and members."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from mlcopilot.infrastructure.db.base import Base
from mlcopilot.infrastructure.db.models.mixins import UUIDMixin


class Project(UUIDMixin, Base):
    """SQLAlchemy model for projects."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(1024), default="", server_default=text("''"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", name="fk_projects_created_by_users", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )


class ProjectMember(Base):
    """SQLAlchemy model for project memberships."""

    __tablename__ = "project_members"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "projects.id",
            name="fk_project_members_project_id_projects",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "users.id",
            name="fk_project_members_user_id_users",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "project_single_owner_idx",
            "project_id",
            unique=True,
            postgresql_where=text("role = 'owner'"),
        ),
    )
