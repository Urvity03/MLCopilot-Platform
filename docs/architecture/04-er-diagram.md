# 04 — ER Diagram

Full relational model (V1 tables solid; V2/V3 tables exist with complete columns but no business logic writes them yet).

```mermaid
erDiagram
    users ||--o{ api_keys : owns
    users ||--o{ project_members : "member via"
    projects ||--o{ project_members : has
    projects ||--o{ datasets : contains
    projects ||--o{ experiments : contains
    projects ||--o{ uploads : contains
    projects ||--o{ chat_sessions : contains
    projects ||--o{ memory_records : accumulates
    projects ||--o{ integration_links : configures
    projects ||--o{ events : "scopes"
    datasets ||--o{ dataset_versions : versions
    dataset_versions ||--o{ dataset_analyses : analyzed
    experiments ||--o{ metric_points : records
    experiments ||--o{ experiment_dataset_links : uses
    dataset_versions ||--o{ experiment_dataset_links : "used by"
    experiments ||--o{ models : produces
    experiments ||--o{ investigations : investigated
    investigations ||--o{ evidence_items : cites
    uploads ||--o{ parsed_chunks : "split into"
    chat_sessions ||--o{ chat_messages : contains
    integration_links ||--o{ synced_commits : indexes
    integration_links ||--o{ synced_pull_requests : indexes
    integration_links ||--o{ synced_issues : indexes
    integration_links ||--o{ mlflow_imported_runs : imports
    memory_records ||--o{ memory_links : "links to artifacts"
    events ||--o{ outbox : "dispatched via"

    users {
        uuid id PK
        text email UK
        text password_hash
        text name
        bool is_active
        timestamptz created_at
    }
    api_keys {
        uuid id PK
        uuid user_id FK
        text name
        text key_hash UK
        text prefix
        text[] scopes
        timestamptz revoked_at
        timestamptz last_used_at
    }
    projects {
        uuid id PK
        text name
        text slug UK
        text description
        uuid created_by FK
        timestamptz created_at
    }
    project_members {
        uuid project_id PK_FK
        uuid user_id PK_FK
        text role
        timestamptz added_at
    }
    datasets {
        uuid id PK
        uuid project_id FK
        text name
        text description
    }
    dataset_versions {
        uuid id PK
        uuid dataset_id FK
        int version
        text storage_uri
        bigint size_bytes
        text checksum
        jsonb schema_summary
    }
    dataset_analyses {
        uuid id PK
        uuid dataset_version_id FK
        text analyzer
        text status
        jsonb report
    }
    experiments {
        uuid id PK
        uuid project_id FK
        text name
        text status
        jsonb hyperparameters
        text git_commit_sha
        timestamptz started_at
        timestamptz finished_at
    }
    metric_points {
        bigint id PK
        uuid experiment_id FK
        text name
        float value
        int step
        timestamptz recorded_at
    }
    models {
        uuid id PK
        uuid experiment_id FK
        text name
        text version
        jsonb metadata
    }
    uploads {
        uuid id PK
        uuid project_id FK
        text kind
        text filename
        text storage_uri
        text parse_status
        jsonb metadata
    }
    parsed_chunks {
        uuid id PK
        uuid upload_id FK
        int position
        text content
        jsonb metadata
    }
    memory_records {
        uuid id PK
        uuid project_id FK
        text kind
        text content
        jsonb source_event
        timestamptz created_at
    }
    memory_links {
        uuid memory_record_id PK_FK
        text artifact_type PK
        uuid artifact_id PK
    }
    investigations {
        uuid id PK
        uuid experiment_id FK
        text trigger
        text status
        jsonb explanation
    }
    evidence_items {
        uuid id PK
        uuid investigation_id FK
        text kind
        jsonb payload
        text summary
    }
    chat_sessions {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        text title
    }
    chat_messages {
        uuid id PK
        uuid session_id FK
        text role
        text content
        jsonb agent_trace
    }
    integration_links {
        uuid id PK
        uuid project_id FK
        text provider
        jsonb config
        text sync_cursor
    }
    events {
        bigint sequence PK
        uuid id UK
        text type
        int version
        uuid project_id
        uuid actor_id
        text aggregate_type
        uuid aggregate_id
        jsonb payload
        timestamptz occurred_at
    }
    outbox {
        bigint id PK
        bigint event_sequence FK
        text status
        int attempts
        timestamptz next_attempt_at
    }
```

Embedding tables (`embeddings`), FTS columns, and V2/V3 tables (`teams`, `team_members`, `subscriptions`, `usage_records`, `notifications`, `notification_preferences`, `audit_records`, `model_cards`, `generated_documents`) are specified in [05](05-postgresql-schema.md) and [06](06-pgvector-schema.md).
