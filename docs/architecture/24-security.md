# 24 — Security Model

## Threat model (summary)

| Threat | Mitigation |
|---|---|
| Credential stuffing / brute force | argon2id, rate-limited auth endpoints (5/min/IP), timing-safe verification, no user enumeration |
| Stolen refresh token | rotation with family revocation on reuse ([09](09-authentication.md)) |
| Leaked API key | hashed at rest, scoped, revocable, prefix-only display |
| Cross-tenant access | every query filters by `project_id` derived from RBAC dependency — never from request body; non-members get 404 |
| SQL injection | SQLAlchemy bound parameters exclusively; no string-built SQL (raw hybrid-search SQL uses bound params) |
| Cypher injection | parameterized Cypher only; label/relationship names from enums, never user input |
| Malicious uploads | extension + magic-byte validation (`.ipynb` must parse as JSON/nbformat, PDF magic check), size caps (env-configured), MinIO storage outside web root, no execution of notebook code |
| SSRF via integrations | MCP servers receive explicit allow-listed configuration; browser/terminal/docker servers disabled by default |
| Prompt injection → tool abuse | mechanical per-agent tool allow-lists ([16](16-mcp.md)); read-only MCP modes for postgres/neo4j; citations verified against real artifact ids before persisting |
| DoS | slowapi rate limits (per-user and per-IP), pagination caps, graph node caps, request body size limits |
| Secret leakage | secrets only in env; config repr redacts; `integration_links.config` stores no tokens (tokens live in env / per-deployment secret store); structlog processors scrub known secret keys |

## Headers & transport

API sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict CORS (exact origin list from env, credentials only for the web origin). TLS terminates at the platform (Vercel/Railway).

## Rate limits (defaults, env-tunable)

| Surface | Limit |
|---|---|
| `/auth/login`, `/auth/register` | 5/min/IP |
| chat message send | 20/min/user |
| search | 60/min/user |
| general API | 240/min/user |

## Dependency & supply chain

- `uv.lock` / `pnpm-lock.yaml` committed; Dependabot weekly; `pip-audit` + `pnpm audit` jobs in CI (non-blocking report, blocking on critical).
- Images run as non-root; no compilers in runtime layers.

## Disclosure

`SECURITY.md` defines private reporting via GitHub security advisories and a 90-day disclosure window.
