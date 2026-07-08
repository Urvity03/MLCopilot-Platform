"""Comparable and ordered role definitions for project-scoped access control."""

from __future__ import annotations

from enum import Enum
from functools import total_ordering


@total_ordering
class Role(Enum):
    """Hierarchical and comparable roles per project (docs/architecture/10-rbac.md)."""

    VIEWER = "viewer"
    MEMBER = "member"
    ADMIN = "admin"
    OWNER = "owner"

    def __lt__(self, other: Role) -> bool:
        if not isinstance(other, Role):
            return NotImplemented
        order = [Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER]
        return order.index(self) < order.index(other)
