# 18 — Knowledge Graph Architecture

Builds on the Neo4j model ([07](07-neo4j-graph-model.md)); this document covers the API surface, traversal semantics, and visualization contract.

## API surface (`features/graph`)

| Endpoint | Purpose |
|---|---|
| `GET /graph/neighborhood` | ego-graph around an artifact for visualization: `artifact_type`, `artifact_id`, `depth` (1–3), `labels[]` filter, node cap (default 150, degree-pruned) |
| `GET /graph/diff` | "what changed between Experiment A and B": commits between shas, dataset version delta, hyperparameter diff, feature set delta, metric deltas — Neo4j traversal + Postgres detail merge |
| internal `paths(from, to, max_hops)` | Search/Investigation agents trace provenance chains |

## Semantic traversal

Traversal is **typed, not free-form**: services expose named traversals with fixed relationship sets so cost is bounded and results are explainable:

- `lineage(experiment)` — datasets, commits, notebooks, papers feeding an experiment.
- `influence(paper)` — experiments and decisions downstream of a paper.
- `failure_context(experiment)` — similar failures + shared artifacts.
- `evolution(project)` — chronological experiment chain with decisions attached.

Each returns nodes + edges + a provenance score; agents cite traversal results as `Citation`s.

## Visualization contract (React Flow)

```json
{
  "nodes": [{ "id": "…", "type": "experiment", "label": "exp-42",
              "data": { "status": "completed", "headline_metric": 0.941 } }],
  "edges": [{ "id": "…", "source": "…", "target": "…",
              "type": "USED_DATASET", "label": "used" }],
  "truncated": false
}
```

- Node `type` drives frontend node components (color, icon, inspector fields).
- Server-side degree pruning keeps payloads < 150 nodes; `truncated: true` tells the UI to offer "expand from node".
- Layout is client-side (dagre for lineage views, force for neighborhoods).

## Consistency

Graph lags Postgres by outbox latency (typically < 3 s). The UI treats the graph as eventually consistent; artifact detail panels always fetch authoritative data from Postgres-backed endpoints.
