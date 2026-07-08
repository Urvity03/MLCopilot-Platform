# 19 — Search Architecture

## Modes

`GET /projects/{id}/search?q=…&mode=hybrid|vector|keyword&types=…`

| Mode | Path |
|---|---|
| `keyword` | Postgres FTS (`websearch_to_tsquery`) over `embeddings.search_tsv` |
| `vector` | pgvector cosine KNN over `embeddings.embedding` |
| `hybrid` (default) | both + RRF fusion + optional graph expansion |

## Hybrid pipeline

```sql
WITH vec AS (
  SELECT id, artifact_type, artifact_id, content,
         row_number() OVER (ORDER BY embedding <=> :query_vec) AS r
  FROM embeddings
  WHERE project_id = :pid AND artifact_type = ANY(:types)
  ORDER BY embedding <=> :query_vec LIMIT 40
),
kw AS (
  SELECT id, artifact_type, artifact_id, content,
         row_number() OVER (ORDER BY ts_rank(search_tsv, q) DESC) AS r
  FROM embeddings, websearch_to_tsquery('english', :query) q
  WHERE project_id = :pid AND artifact_type = ANY(:types) AND search_tsv @@ q
  LIMIT 40
)
-- RRF: score = Σ 1 / (60 + rank)
SELECT COALESCE(v.id, k.id) AS id, ...,
       COALESCE(1.0/(60+v.r), 0) + COALESCE(1.0/(60+k.r), 0) AS score
FROM vec v FULL OUTER JOIN kw k USING (id)
ORDER BY score DESC LIMIT :limit;
```

1. Query embedding computed once per request (cached in Redis for 10 min keyed by hash).
2. RRF (k = 60) fuses ranks — robust without score normalization.
3. **Graph expansion** (hybrid only): top-5 hits expand 1 hop in Neo4j (`:ABOUT`, `:USED_DATASET`, `:AT_COMMIT`); neighbors not already present join the tail with a dampened score (×0.5). This surfaces artifacts *related to* what matched, which pure retrieval misses.
4. Results hydrate from their source tables into typed `SearchResult { artifact_type, artifact_id, title, snippet, score, highlights }`.

## Everything searchable

The polymorphic `embeddings` table ([06](06-pgvector-schema.md)) covers memory records, parsed chunks (notebooks/papers), experiments (name + description + hparam summary), datasets, commits, and chat messages. Adding a searchable type = ensuring its events route through the `EMBEDDINGS` consumer — no search-code changes.

## Consumers

- Command palette (⌘K) uses `types` unfiltered with a low limit for instant results.
- Search page offers type filters, kind filters for memory, and full pagination.
- Search Agent calls the same service internally (`internal.search.hybrid` tool).
