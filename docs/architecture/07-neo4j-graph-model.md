# 07 — Neo4j Graph Model

## Role

Neo4j is a **rebuildable projection** of PostgreSQL, optimized for traversal ("which notebook influenced the experiment whose regression this paper explains?"). It is never the system of record. Every node carries the Postgres UUID as `id`, so cross-store joins are trivial.

## Node labels

```
(:Project      {id, name, slug})
(:User         {id, name})
(:Dataset      {id, name})
(:DatasetVersion {id, version, checksum})
(:Experiment   {id, name, status, started_at, finished_at})
(:Model        {id, name, version})
(:Metric       {id, name})                       -- one node per metric name per project
(:Feature      {id, name})                       -- extracted by Dataset/Notebook agents
(:Notebook     {id, filename})
(:Paper        {id, filename, title})
(:Commit       {id, sha, message, committed_at})
(:PullRequest  {id, number, title})
(:Issue        {id, number, title})
(:Prompt       {id})
(:Conversation {id, title})
(:Document     {id, kind})                       -- generated documentation (V2/V3)
(:MemoryRecord {id, kind})
(:Decision     {id, summary})                    -- distilled by Memory Agent
(:Failure      {id, summary})
(:Investigation {id, status})
```

## Relationships

```
(:User)-[:MEMBER_OF {role}]->(:Project)
(:Project)-[:CONTAINS]->(:Dataset|:Experiment|:Notebook|:Paper|:Conversation)
(:Dataset)-[:HAS_VERSION]->(:DatasetVersion)
(:Experiment)-[:USED_DATASET]->(:DatasetVersion)
(:Experiment)-[:PRODUCED]->(:Model)
(:Experiment)-[:RECORDED {best, last}]->(:Metric)
(:Experiment)-[:AT_COMMIT]->(:Commit)
(:Experiment)-[:PRECEDED_BY]->(:Experiment)         -- project-chronological chain
(:Commit)-[:PART_OF]->(:PullRequest)
(:PullRequest)-[:RESOLVES]->(:Issue)
(:Notebook)-[:MENTIONS]->(:Dataset|:Feature|:Metric)
(:Paper)-[:INSPIRED]->(:Experiment)                 -- created by agents/users
(:DatasetVersion)-[:HAS_FEATURE]->(:Feature)
(:MemoryRecord)-[:ABOUT]->(any artifact node)
(:Decision)-[:SUPERSEDES]->(:Decision)
(:Failure)-[:SIMILAR_TO {score}]->(:Failure)
(:Investigation)-[:EXPLAINS]->(:Experiment)
(:Investigation)-[:CITES]->(:Commit|:DatasetVersion|:Notebook|:MemoryRecord|...)
(:Conversation)-[:REFERENCED]->(any artifact node)
```

## Constraints & indexes

```cypher
CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE;
-- identical uniqueness constraint per label
CREATE INDEX experiment_status IF NOT EXISTS FOR (e:Experiment) ON (e.status);
CREATE INDEX commit_sha IF NOT EXISTS FOR (c:Commit) ON (c.sha);
```

## Sync strategy (Postgres → Neo4j)

1. Domain events land in the outbox (same transaction as state change).
2. The `graph-sync` Celery queue consumes each event and executes an **idempotent** `MERGE`-based Cypher handler per event type (`MERGE` on `id`, then `SET` properties, then `MERGE` relationships).
3. Ordering within an aggregate is preserved by the outbox's monotonically increasing event sequence; handlers are also written to be commutative where possible.
4. **Full rebuild**: `make graph-rebuild` truncates the graph and replays the entire event store — recovery from any drift or Neo4j loss.

## Query surface

The `features/graph` service exposes:
- `neighborhood(artifact, depth, labels[])` — visualization payloads for React Flow.
- `paths(from, to, max_hops)` — semantic traversal for the Search Agent.
- `experiment_diff(a, b)` — commits, dataset versions, hparams, features that differ between two experiments (combined with Postgres data).
