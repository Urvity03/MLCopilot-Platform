"""Argon2id password hashing via pwdlib.

Configuration per docs/architecture/09-authentication.md:
  - algorithm: argon2id
  - memory:    64 MiB (65 536 KiB)
  - time cost: 3 iterations
"""

from __future__ import annotations

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

# Production defaults from doc 09.
_DEFAULT_TIME_COST = 3
_DEFAULT_MEMORY_COST = 65_536  # 64 MiB in KiB


class PasswordHasher:
    """Argon2id password hashing and verification."""

    def __init__(
        self,
        *,
        time_cost: int = _DEFAULT_TIME_COST,
        memory_cost: int = _DEFAULT_MEMORY_COST,
    ) -> None:
        self._hasher = PasswordHash((
            Argon2Hasher(time_cost=time_cost, memory_cost=memory_cost),
        ))

    def hash(self, password: str) -> str:
        """Return an argon2id hash of *password*."""
        return self._hasher.hash(password)

    def verify(self, password: str, hash: str) -> bool:
        """Timing-safe verification of *password* against *hash*."""
        return self._hasher.verify(password, hash)
