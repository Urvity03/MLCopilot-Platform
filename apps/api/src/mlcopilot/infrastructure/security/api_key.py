"""API key generation, hashing, and verification.

Format per docs/architecture/09-authentication.md:
  mlc_<8-char hex prefix>_<32-byte urlsafe secret>

Storage: prefix (display) + sha256(full_key) (lookup).
Verification: constant-time via hmac.compare_digest.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

_KEY_PREFIX = "mlc"


class ApiKeyManager:
    """API key lifecycle: generation, hashing, and constant-time verification."""

    @staticmethod
    def generate() -> tuple[str, str, str]:
        """Generate a new API key.

        Returns:
            A tuple of ``(full_key, prefix, key_hash)`` where *full_key* is
            shown to the user exactly once.
        """
        prefix = secrets.token_hex(4)  # 8 hex characters
        secret = secrets.token_urlsafe(32)  # 32 random bytes, base64url-encoded
        full_key = f"{_KEY_PREFIX}_{prefix}_{secret}"
        key_hash = ApiKeyManager.hash_key(full_key)
        return full_key, prefix, key_hash

    @staticmethod
    def hash_key(key: str) -> str:
        """Return the SHA-256 hex digest of *key*."""
        return hashlib.sha256(key.encode()).hexdigest()

    @staticmethod
    def verify_key(key: str, key_hash: str) -> bool:
        """Constant-time comparison of *key* against *key_hash*."""
        computed = hashlib.sha256(key.encode()).hexdigest()
        return hmac.compare_digest(computed, key_hash)
