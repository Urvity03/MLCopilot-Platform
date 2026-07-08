"""Domain aggregates representing projects and memberships."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mlcopilot.domain.role import Role
    from mlcopilot.domain.user import User


@dataclass
class ProjectMember:
    """Project membership entity."""

    project_id: uuid.UUID
    user_id: uuid.UUID
    role: Role
    added_at: datetime


@dataclass
class Project:
    """Project workspace aggregate root."""

    id: uuid.UUID
    name: str
    slug: str
    description: str
    created_by: uuid.UUID
    created_at: datetime


@dataclass(frozen=True)
class ProjectContext:
    """Enforced role-based request context for project-scoped operations."""

    project_id: uuid.UUID
    user: User
    role: Role
