# 11 — API Contracts

## Conventions

- Base path `/api/v1`. Breaking changes require `/api/v2`; additive changes do not.
- Resource-oriented REST; verbs only for true actions (`/experiments/{id}/complete`).
- JSON everywhere except uploads (`multipart/form-data`) and chat streaming (SSE).
- All ids are UUIDs. Timestamps are RFC 3339 UTC.
- OpenAPI served at `/api/v1/openapi.json`; the TS client in `packages/contracts` is generated from it in CI (drift fails the build).

## Error envelope

Every non-2xx response:

```json
{
  "error": {
    "code": "permission_denied",       // stable, machine-readable
    "message": "You need the member role to create experiments.",
    "details": [{"field": "…", "issue": "…"}],
    "request_id": "req_8f3a…"
  }
}
```

| HTTP | Codes |
|---|---|
| 400 | `validation_error` |
| 401 | `unauthenticated`, `token_expired`, `token_reuse_detected` |
| 403 | `permission_denied`, `api_key_scope` |
| 404 | `not_found` |
| 409 | `conflict`, `illegal_state_transition` |
| 422 | `unprocessable` (schema-valid but semantically wrong) |
| 429 | `rate_limited` (+ `Retry-After`) |
| 501 | `capability_not_enabled` (V2/V3 gates) |

## Pagination

Cursor-based on all list endpoints:

```
GET /api/v1/projects/{id}/experiments?limit=25&cursor=eyJz…
→ { "items": [...], "next_cursor": "eyJz…" | null }
```

## Endpoint map (V1)

```
POST   /auth/register | /auth/login | /auth/refresh | /auth/logout
GET    /users/me                      PATCH /users/me
GET    /api-keys                      POST /api-keys        DELETE /api-keys/{id}

GET/POST        /projects
GET/PATCH/DELETE /projects/{id}
GET/POST        /projects/{id}/members     PATCH/DELETE /projects/{id}/members/{userId}

GET/POST        /projects/{id}/datasets
GET             /projects/{id}/datasets/{dsId}
POST            /projects/{id}/datasets/{dsId}/versions        (multipart)
GET             /projects/{id}/datasets/{dsId}/versions/{v}/analyses
POST            /projects/{id}/datasets/{dsId}/versions/{v}/analyses   {analyzer}

GET/POST        /projects/{id}/experiments
GET/PATCH       /projects/{id}/experiments/{expId}
POST            /projects/{id}/experiments/{expId}/start | /complete | /fail | /abort
POST            /projects/{id}/experiments/{expId}/metrics      (batch points)
GET             /projects/{id}/experiments/{expId}/metrics?name=…
GET             /projects/{id}/experiments/compare?a=…&b=…

GET             /projects/{id}/timeline?types=…&cursor=…        (event history)

POST            /projects/{id}/uploads          (multipart; kind=notebook|paper)
GET             /projects/{id}/uploads          GET /projects/{id}/uploads/{uploadId}

GET/PUT/DELETE  /projects/{id}/integrations/{provider}          (github|mlflow)
POST            /projects/{id}/integrations/{provider}/sync

GET             /projects/{id}/graph/neighborhood?artifact_type=…&artifact_id=…&depth=…
GET             /projects/{id}/graph/diff?experiment_a=…&experiment_b=…

GET             /projects/{id}/search?q=…&types=…&mode=hybrid|vector|keyword

GET             /projects/{id}/memory?kind=…&cursor=…
GET             /projects/{id}/memory/{recordId}

GET/POST        /projects/{id}/investigations
GET             /projects/{id}/investigations/{invId}

GET/POST        /projects/{id}/chat/sessions
GET             /projects/{id}/chat/sessions/{sessionId}/messages
POST            /projects/{id}/chat/sessions/{sessionId}/messages    → SSE stream

GET  /health/live   GET /health/ready
```

V2/V3 routers (`/teams`, `/billing`, `/notifications`, `/audit`, `/model-cards`, `/docs-generator`) mount with complete schemas; handlers check the Capability Registry and return `501 capability_not_enabled` until enabled.

## SSE contract (chat)

`POST …/messages` with `Accept: text/event-stream` responds with events:

```
event: message.delta        data: {"text": "…"}
event: agent.step           data: {"agent": "investigation", "phase": "collecting", "detail": "…"}
event: message.citations    data: {"citations": [{"artifact_type": "commit", "artifact_id": "…"}]}
event: message.completed    data: {"message_id": "…"}
event: error                data: {"code": "…", "message": "…"}
```

Heartbeat comment `: ping` every 15 s. Clients reconnect with `Last-Event-ID` for the completed-message fallback fetch.
