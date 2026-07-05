# 06 — pgvector Schema

## Design

One **polymorphic embedding table** instead of per-entity vector columns. Rationale: hybrid search must rank memory records, parsed chunks, experiments, datasets, papers, and commits in a *single* query; a unified table gives one HNSW index and one ranking path.

```sql
CREATE TABLE embeddings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    artifact_type text NOT NULL,      -- 'memory_record' | 'parsed_chunk' | 'experiment'
                                      -- | 'dataset' | 'commit' | 'chat_message' | ...
    artifact_id   uuid NOT NULL,
    content       text NOT NULL,      -- the exact text that was embedded
    embedding     vector(1024) NOT NULL,
    model         text NOT NULL,      -- embedding model id used
    created_at    timestamptz NOT NULL DEFAULT now(),
    search_tsv    tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    UNIQUE (artifact_type, artifact_id)
);

CREATE INDEX embeddings_hnsw_idx
    ON embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX embeddings_project_type_idx ON embeddings(project_id, artifact_type);
CREATE INDEX embeddings_tsv_idx ON embeddings USING gin(search_tsv);
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Dimension | **1024**, configured via `EMBEDDING_DIMENSIONS` | fits Voyage/Cohere/OpenAI-large-truncated; a dimension change requires a migration + re-embed job (explicit, versioned) |
| Distance | cosine (`vector_cosine_ops`) | standard for normalized text embeddings |
| Index | HNSW over IVFFlat | better recall at low build cost for < 10M rows; no training step |
| Text + vector together | `content` + generated `tsvector` on the same row | hybrid (RRF) search executes as one SQL statement — no cross-table join fan-out |
| Upsert key | `(artifact_type, artifact_id)` | re-embedding replaces, never duplicates |

## Write path

Embedding is **always asynchronous**: domain event → outbox → `embeddings` Celery queue → `EmbeddingProvider.embed()` → upsert. API requests never block on embedding calls. Failures retry with exponential backoff; a nightly reconciliation task re-embeds artifacts missing rows.

## Query path

Hybrid search (detailed in [19-search.md](19-search.md)) runs vector KNN and FTS as two CTEs over this table, fuses with Reciprocal Rank Fusion, then optionally expands via Neo4j neighbors.
