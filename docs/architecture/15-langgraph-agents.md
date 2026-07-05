# 15 — LangGraph Multi-Agent Architecture

## Topology

One **coordinator graph** per chat/investigation invocation. The Coordinator classifies intent, the Planner decomposes multi-step work, specialists execute, and the Coordinator composes the final grounded answer.

```
                          ┌────────────┐
   user / event ────────► │ Coordinator │◄───────────────┐
                          └─────┬──────┘                 │
                     intent     │                        │ results
                                ▼                        │
                          ┌────────────┐   plan    ┌─────┴──────┐
                          │  Planner   │─────────► │ Specialists │
                          └────────────┘           └────────────┘
        Memory · Dataset · Experiment · Notebook · GitHub ·
        Research · Documentation · Search · Investigation
```

## Shared state (typed)

```python
class AgentState(TypedDict):
    project_id: UUID
    user_id: UUID
    messages: list[ChatMessage]            # conversation window
    intent: Intent | None                  # coordinator output
    plan: list[PlanStep] | None            # planner output
    retrieved_memory: list[MemoryHit]      # memory agent output
    tool_results: list[ToolResult]
    citations: list[Citation]              # accumulate; final answer must carry them
    final_answer: str | None
    trace: list[AgentStep]                 # streamed to UI as agent.step events
```

## Agent responsibilities & permissions

| Agent | Responsibility | Tool permissions (MCP/internal) |
|---|---|---|
| **Coordinator** | intent classification, routing, final synthesis, citation assembly | none (pure LLM + state) |
| **Planner** | decompose complex questions into ordered `PlanStep`s with assigned agents | none |
| **Memory** | retrieve/write memory records; distill decisions & failures | memory read/write, hybrid search |
| **Dataset** | dataset stats, version diffs, analyzer reports, leakage heuristics | dataset repos, analyzer runner, filesystem MCP |
| **Experiment** | metrics queries, comparisons, baselines, timeline narration | experiment repos, metric queries |
| **Notebook** | reason over parsed notebook cells and outputs | chunk retrieval, filesystem MCP |
| **GitHub** | commit/PR/issue context, diffs between shas | GitHub MCP (read-only tools) |
| **Research** | paper chunk retrieval, literature-grounded suggestions | chunk retrieval, browser MCP (optional) |
| **Documentation** | draft docs/model cards from project knowledge (V2/V3 capability-gated output) | memory read, experiment read |
| **Search** | hybrid + graph search on behalf of other agents | search service, Neo4j MCP (read) |
| **Investigation** | evidence-driven WHY reasoning ([28](28-investigation-engine.md)) | evidence collectors, all read tools |

Permissions are enforced mechanically: each agent receives only its allow-listed tool set from the MCP adapter ([16-mcp.md](16-mcp.md)) — not a prompt-level convention.

## Structured outputs

Every agent's terminal node produces a Pydantic model (`IntentClassification`, `Plan`, `MemoryAnswer`, `InvestigationExplanation`, …) via `LLMProvider.complete_structured`. Free-text only exists inside the final user-facing synthesis.

## Grounding rules

1. Specialists must attach `Citation`s (typed `ArtifactRef`s) to claims.
2. The Coordinator refuses to state project-specific facts without at least one citation in state; otherwise it answers "insufficient evidence" and says what data would help.
3. Conversations end by emitting `ai.conversation_completed`, feeding chat back into memory.

## Execution & streaming

- Chat: the graph runs inside the SSE request; node transitions stream as `agent.step` events, token deltas as `message.delta`.
- Investigations: the same graph (entry: Investigation) runs in Celery with status checkpoints.
- Checkpointing: LangGraph checkpoints to Postgres keyed by session, enabling resumable multi-turn context.
- Every node logs `agent`, `node`, `latency`, `tokens`, `request_id` (structlog).

## Extensibility

Plugins register additional specialist agents via the `agents` extension point ([20](20-plugin-system.md)); the Planner discovers them from the registry with their declared capabilities — no coordinator changes required.
