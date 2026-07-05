# 05 — PostgreSQL Schema

PostgreSQL 16 with the `pgvector` extension. All tables managed by Alembic migrations; this document is the design reference (migrations are authoritative).

## Conventions

- Primary keys: `uuid DEFAULT gen_random_uuid()` except append-only ledgers (`events`, `metric_points`, `outbox`) which use `bigint GENERATED ALWAYS AS IDENTITY` for cheap ordering.
- All timestamps `timestamptz`, UTC.
- Foreign keys `ON DELETE CASCADE` inside an aggregate; `ON DELETE RESTRICT` across aggregates (e.g. `models.experiment_id`).
- JSONB for genuinely schemaless payloads only (event payloads, reports, hyperparameters); everything queryable gets a real column.
- Naming: snake_case, plural tables, `<table>_<col>_idx` indexes.

## Core DDL (reference)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext NOT NULL UNIQUE,
    password_hash text NOT NULL,
    name          text NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         text NOT NULL,
    prefix       text NOT NULL,                -- first 8 chars, displayable
    key_hash     text NOT NULL UNIQUE,         -- sha256 of full key
    scopes       text[] NOT NULL,
    revoked_at   timestamptz,
    last_used_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_user_id_idx ON api_keys(user_id);

CREATE TABLE projects (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '',
    created_by  uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('owner','admin','member','viewer')),
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);
-- exactly one owner per project
CREATE UNIQUE INDEX project_single_owner_idx
    ON project_members(project_id) WHERE role = 'owner';

CREATE TABLE datasets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);

CREATE TABLE dataset_versions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id     uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version        integer NOT NULL,
    storage_uri    text NOT NULL,
    size_bytes     bigint NOT NULL,
    checksum       text NOT NULL,
    schema_summary jsonb NOT NULL DEFAULT '{}',
    created_by     uuid NOT NULL REFERENCES users(id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (dataset_id, version)
);

CREATE TABLE dataset_analyses (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE CASCADE,
    analyzer           text NOT NULL,           -- extension-point id, e.g. 'core.profile'
    status             text NOT NULL CHECK (status IN ('pending','running','completed','failed')),
    report             jsonb NOT NULL DEFAULT '{}',
    created_at         timestamptz NOT NULL DEFAULT now(),
    completed_at       timestamptz
);

CREATE TABLE experiments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            text NOT NULL,
    description     text NOT NULL DEFAULT '',
    status          text NOT NULL CHECK (status IN ('created','running','completed','failed','aborted')),
    hyperparameters jsonb NOT NULL DEFAULT '{}',
    git_commit_sha  text,
    created_by      uuid NOT NULL REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    started_at      timestamptz,
    finished_at     timestamptz
);
CREATE INDEX experiments_project_created_idx ON experiments(project_id, created_at DESC);

CREATE TABLE metric_points (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    name          text NOT NULL,
    value         double precision NOT NULL,
    step          integer NOT NULL DEFAULT 0,
    recorded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX metric_points_exp_name_step_idx ON metric_points(experiment_id, name, step);

CREATE TABLE experiment_dataset_links (
    experiment_id      uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    dataset_version_id uuid NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
    PRIMARY KEY (experiment_id, dataset_version_id)
);

CREATE TABLE models (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE RESTRICT,
    name          text NOT NULL,
    version       text NOT NULL,
    metadata      jsonb NOT NULL DEFAULT '{}',
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE uploads (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind         text NOT NULL CHECK (kind IN ('notebook','paper')),
    filename     text NOT NULL,
    storage_uri  text NOT NULL,
    parse_status text NOT NULL CHECK (parse_status IN ('pending','parsing','parsed','failed')),
    metadata     jsonb NOT NULL DEFAULT '{}',
    uploaded_by  uuid NOT NULL REFERENCES users(id),
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parsed_chunks (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    position  integer NOT NULL,
    content   text NOT NULL,
    metadata  jsonb NOT NULL DEFAULT '{}',
    UNIQUE (upload_id, position)
);

CREATE TABLE memory_records (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind         text NOT NULL CHECK (kind IN ('fact','decision','failure','insight')),
    content      text NOT NULL,
    source_event jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    search_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);
CREATE INDEX memory_records_tsv_idx ON memory_records USING gin(search_tsv);

CREATE TABLE memory_links (
    memory_record_id uuid NOT NULL REFERENCES memory_records(id) ON DELETE CASCADE,
    artifact_type    text NOT NULL,
    artifact_id      uuid NOT NULL,
    PRIMARY KEY (memory_record_id, artifact_type, artifact_id)
);
CREATE INDEX memory_links_artifact_idx ON memory_links(artifact_type, artifact_id);

CREATE TABLE investigations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    trigger       text NOT NULL CHECK (trigger IN ('metric_changed','user_requested')),
    status        text NOT NULL CHECK (status IN ('pending','collecting','reasoning','completed','failed')),
    question      text NOT NULL,
    explanation   jsonb,            -- structured: {summary, claims: [{text, evidence_ids}], confidence}
    created_at    timestamptz NOT NULL DEFAULT now(),
    completed_at  timestamptz
);

CREATE TABLE evidence_items (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id uuid NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    kind             text NOT NULL,
    payload          jsonb NOT NULL,
    summary          text NOT NULL
);

CREATE TABLE chat_sessions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      text NOT NULL DEFAULT 'New chat',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('user','assistant','system')),
    content     text NOT NULL,
    agent_trace jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integration_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider    text NOT NULL CHECK (provider IN ('github','mlflow')),
    config      jsonb NOT NULL,       -- repo full name / tracking uri; secrets in env, never here
    sync_cursor text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, provider)
);

CREATE TABLE synced_commits (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_link_id uuid NOT NULL REFERENCES integration_links(id) ON DELETE CASCADE,
    sha                 text NOT NULL,
    message             text NOT NULL,
    author              text NOT NULL,
    committed_at        timestamptz NOT NULL,
    files_changed       jsonb NOT NULL DEFAULT '[]',
    UNIQUE (integration_link_id, sha)
);
-- synced_pull_requests, synced_issues, mlflow_imported_runs follow the same shape
```

## Event store & outbox

See [08-event-store.md](08-event-store.md) for `events` and `outbox` DDL.

## V2/V3 tables (columns complete, written by future services)

`teams`, `team_members`, `subscriptions(plan, status, provider_ref)`, `usage_records`, `notifications`, `notification_preferences`, `audit_records(actor_id, action, target_type, target_id, context)`, `model_cards(model_id, content, format)`, `generated_documents(project_id, kind, content, source_refs)`.

## Migration policy

- One migration per PR maximum; always reversible where physically possible.
- `alembic upgrade head` runs automatically in the API container entrypoint (gated by advisory lock to avoid races with workers).
