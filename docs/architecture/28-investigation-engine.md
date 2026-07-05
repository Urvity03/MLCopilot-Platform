# 28 — Investigation Engine

The Investigation Engine answers **WHY** — with evidence. It is not a chat feature; it is a pipeline: trigger → evidence collection → reasoning → cited explanation, persisted and fed back into memory.

## Triggers

1. **`metric.changed` event** — the `METRIC_WATCH` consumer detects a completed experiment whose headline metric deviates from the project baseline beyond `INVESTIGATION_METRIC_THRESHOLD` (default 1%).
2. **User request** — `POST /investigations {experiment_id, question}` or via chat ("why did val loss spike in exp 42?" routes to the Investigation Agent, which persists a first-class Investigation).

## Evidence collectors

Each collector implements one protocol and returns typed `EvidenceItem`s (kind, payload, human summary). Collectors run concurrently in the `investigations` queue, status `collecting`:

| Collector | Sources | Produces |
|---|---|---|
| `GitDiffCollector` | commits between the experiment's sha and the baseline experiment's sha (GitHub MCP / synced_commits) | changed files, diff stats, commit messages |
| `HparamDeltaCollector` | both experiments' hyperparameters | added/removed/changed keys with values |
| `DatasetChangeCollector` | experiment_dataset_links + version metadata + analyzer reports | version bumps, size/schema/quality deltas |
| `NotebookOutputCollector` | parsed chunks of notebooks linked near either experiment | relevant cell outputs (metric prints, warnings) |
| `TrainingLogCollector` | metric_points curves | divergence step, loss curve anomalies, early-stop signals |
| `PriorExperimentCollector` | memory (`failure`/`insight` records) + `SIMILAR_TO` graph edges | similar past changes and their outcomes |

Baseline selection: best prior completed experiment for the same headline metric (fallback: chronologically previous). Both experiments and the baseline id are recorded on the investigation for reproducibility.

## Reasoning (status `reasoning`)

The Investigation Agent ([15](15-langgraph-agents.md)) receives the evidence set and must return a structured explanation:

```python
class InvestigationExplanation(BaseModel):
    summary: str
    claims: list[Claim]           # Claim: text + evidence_ids (≥1, validated to exist)
    confidence: Literal["high", "medium", "low"]
    suggested_next_steps: list[str]
```

**Validation is mechanical**: claims citing non-existent evidence ids are rejected and the agent re-prompts once; if it still fails, the investigation completes with the verified subset and `confidence: low`. The engine never fabricates certainty.

## Persistence & feedback

- Explanation + evidence stored on the `investigations` / `evidence_items` tables; rendered in the experiment's **WHY panel** and timeline.
- `investigation.completed` event → Memory Agent distills a `decision`/`insight` record when warranted → graph gains `(:Investigation)-[:EXPLAINS]->(:Experiment)` and `[:CITES]` edges.
- Chat answers about "why" reuse completed investigations before starting new ones (dedupe by experiment + question similarity).

## Failure semantics

Collector failures degrade (evidence set notes the gap; agent instructed to acknowledge missing evidence). Hard reasoning failure marks the investigation `failed` with the error — visible in UI, retryable.
