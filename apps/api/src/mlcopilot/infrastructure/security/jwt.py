"""JWT access-token creation and validation via PyJWT.

Design per docs/architecture/09-authentication.md:
  - algorithm:  HS256
  - TTL:        15 minutes
  - claims:     sub (user id), exp, iat, jti, type="access"
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt

from mlcopilot.domain.errors import AuthenticationError

_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15


@dataclass(frozen=True)
class TokenPayload:
    """Decoded access-token claims."""

    sub: uuid.UUID
    exp: datetime
    iat: datetime
    jti: uuid.UUID
    token_type: str


class JWTManager:
    """HS256 JWT creation and validation."""

    def __init__(self, secret: str) -> None:
        if len(secret) < 32:
            msg = "JWT secret must be at least 32 characters"
            raise ValueError(msg)
        self._secret = secret

    def create_access_token(self, user_id: uuid.UUID) -> str:
        """Mint a short-lived access token for *user_id*."""
        now = datetime.now(UTC)
        payload: dict[str, object] = {
            "sub": str(user_id),
            "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": "access",
        }
        return jwt.encode(payload, self._secret, algorithm=_ALGORITHM)

    def decode_access_token(self, token: str) -> TokenPayload:
        """Validate and decode an access token, raising on any failure."""
        try:
            data: dict[str, object] = jwt.decode(
                token, self._secret, algorithms=[_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Access token has expired", code="token_expired")  # noqa: B904
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid access token", code="unauthenticated")  # noqa: B904

        if data.get("type") != "access":
            raise AuthenticationError("Invalid token type", code="unauthenticated")

        return TokenPayload(
            sub=uuid.UUID(str(data["sub"])),
            exp=datetime.fromtimestamp(float(data["exp"]), tz=UTC),  # type: ignore[arg-type]
            iat=datetime.fromtimestamp(float(data["iat"]), tz=UTC),  # type: ignore[arg-type]
            jti=uuid.UUID(str(data["jti"])),
            token_type=str(data["type"]),
        )
