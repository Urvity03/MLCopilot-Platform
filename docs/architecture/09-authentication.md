# 09 — Authentication Architecture

## Methods

| Method | Audience | Transport |
|---|---|---|
| JWT access + rotating refresh tokens | Web app users | `Authorization: Bearer <access>`; refresh via httpOnly cookie on `/auth/refresh` |
| API keys | SDKs, CI, scripts | `X-API-Key: mlc_<prefix>_<secret>` |

## JWT design

- **Access token**: 15 min TTL, HS256 (`SECRET_KEY` from env, min 32 bytes enforced at boot). Claims: `sub` (user id), `exp`, `iat`, `jti`, `type: "access"`.
- **Refresh token**: 14 day TTL, stored **hashed** in `refresh_tokens` table with `family_id` for rotation lineage.
- **Rotation**: every refresh issues a new refresh token and invalidates the used one. Reuse of an already-rotated token revokes the entire family (stolen-token detection).
- Logout revokes the presented family. Password change revokes all families.

```sql
CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id  uuid NOT NULL,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

## API keys

- Format: `mlc_<8-char prefix>_<32-byte urlsafe secret>`. Full key shown **once** at creation.
- Stored: `prefix` (display) + `sha256(full_key)` (lookup). Constant-time comparison.
- Scopes: `read`, `write`, `admin` — checked *in addition to* project RBAC; an API key can never exceed its owner's permissions.
- `last_used_at` updated at most once per minute (avoids hot-row writes).
- Revocation is immediate and terminal.

## Password handling

- `argon2id` via `pwdlib` (memory 64 MiB, time 3). No max-length trap; min 10 chars + compromised-password rejection is a frontend + validation concern.
- Timing-safe login: hash verification runs even for unknown emails (dummy hash) to prevent user enumeration by latency.

## FastAPI wiring

`get_current_user` dependency resolves, in order: Bearer JWT → API key header. Produces a typed `AuthContext { user, via, api_key_scopes | None }` consumed by RBAC dependencies ([10-rbac.md](10-rbac.md)). Anonymous access exists only on `/auth/*`, `/health/*`, and OpenAPI docs.
