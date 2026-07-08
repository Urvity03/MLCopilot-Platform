"""Domain representations of authentication contexts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from mlcopilot.domain.role import Role
    from mlcopilot.domain.user import User


@dataclass(frozen=True)
class AuthContext:
    """Encapsulates the context of the currently authenticated caller."""

    user: User
    via: Literal["jwt", "api_key"]
    api_key_scopes: list[str] | None = None

    def scopes_allow(self, minimum_role: Role | str) -> bool:
        """Enforce API key scope restrictions based on minimum role mappings.

        Mapping:
          - 'read' allows viewer actions.
          - 'write' allows viewer and member actions.
          - 'admin' allows viewer, member, and admin actions.
        """
        if self.via == "jwt":
            return True
        if not self.api_key_scopes:
            return False

        from mlcopilot.domain.role import Role

        role_str = (
            minimum_role.value
            if isinstance(minimum_role, Role)
            else str(minimum_role).lower()
        )
        if "read" in self.api_key_scopes and role_str == "viewer":
            return True
        if "write" in self.api_key_scopes and role_str in ("viewer", "member"):
            return True
        if "admin" in self.api_key_scopes and role_str in ("viewer", "member", "admin"):
            return True
        return False

