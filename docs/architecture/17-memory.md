# 17 — Project Memory Architecture

Project Memory is the product's primary differentiator: a permanent, typed, embedded, graph-linked knowledge substrate over everything a project produces.

## Record model

```
MemoryRecord {
  id, project_id,
  kind: fact | decision | failure | insight,
  content: text,                  # human-readable, self-contained statement
  source_event: envelope | null,  # provenance
  links: [(artifact_type, artifact_id), ...]   # ≥ 1 required
}
```

| Kind | Example |
|---|---|
| `fact` | "Experiment 42 completed with accuracy 0.941, +2.3pp over baseline (exp 38)." |
| `decision` | "Switched from ResNet50 to EfficientNet-B3 after exp 19; ResNet plateaued at 0.89." |
| `failure` | "Exp 23 failed: OOM at batch_size=256 on v2 of the images dataset." |
| `insight` | "Standard-scaling `income` consistently improves recall across exps 12, 18, 27." |

Records are immutable; corrections are new records linked to the old (`SUPERSEDES` in the graph).

## Write paths

1. **Event projection (automatic)** — the `MEMORY_PROJECTION` consumer derives `fact`/`failure` records from the event stream (experiment completed/failed, dataset uploaded, analysis completed, commit indexed, paper parsed, conversation completed). Deterministic templates, no LLM in the hot path.
2. **Agent distillation (AI)** — the Memory Agent creates `decision`/`insight` records when investigations conclude or conversations reveal decisions ("we're abandoning ResNet"). Structured output → validated → stored with citations as links.
3. Both paths emit `memory.record_created`, which triggers embedding + graph MERGE (`(:MemoryRecord)-[:ABOUT]->(artifact)`).

## Retrieval pipeline (Memory Agent + search feature)

```
query ──► hybrid search over embeddings (vector + FTS, RRF)      [19-search.md]
      ──► graph expansion: 1–2 hops from top hits via :ABOUT,
          :PRECEDED_BY, :SIMILAR_TO, :SUPERSEDES                  [07]
      ──► re-rank: recency decay + kind boost (decisions/insights
          rank above raw facts for "why" questions)
      ──► MemoryHit list with provenance → agent state
```

Canonical questions this pipeline answers: *why did accuracy improve* (facts + investigation citations along the experiment chain), *why was ResNet abandoned* (decision records + superseded chain), *which notebook introduced leakage* (failure records linked to notebook chunks + analyzer reports), *show similar failures* (`SIMILAR_TO` edges maintained by the Memory Agent), *explain this project's evolution* (chronological decision/insight walk).

## Retention

Memory is permanent by design. Deleting a project cascades; individual records are never deleted, only superseded. (GDPR-style hard deletes operate at project/user scope.)
