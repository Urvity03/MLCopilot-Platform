# MLCopilot — Product Requirements Document

**Version:** 1.0
**Status:** Approved
**Owners:** Product & Engineering

---

## 1. Vision

MLCopilot is the **AI Operating System for Machine Learning Engineering**.

Machine learning teams do not lose models — they lose *knowledge*. Six months after a project ships, nobody remembers why ResNet was abandoned, which preprocessing step fixed recall, or which notebook introduced data leakage. Experiment trackers record *what* happened. MLCopilot records *what* happened, explains *why* it happened, and recommends *what to do next*.

The product's core differentiator is **Project Memory**: a permanent, queryable, AI-navigable knowledge substrate that connects every artifact a team produces — datasets, experiments, models, metrics, features, hyperparameters, Git commits, pull requests, issues, research papers, notebooks, documentation, prompts, and AI conversations.

### The four questions MLCopilot must answer

| Question | Capability |
|---|---|
| What happened? | Experiment tracking, timeline, event history |
| Why did it happen? | Investigation Engine with cited evidence |
| What should I do next? | Planner + Research agents grounded in memory |
| What has this project learned? | Project Memory retrieval + knowledge graph |

---

## 2. Personas

### P1 — ML Engineer ("Ana")
Runs 10–40 experiments per week. Frustrated by: forgetting which change caused a metric shift, re-running failed ideas that a colleague already tried, and writing model documentation by hand.
Primary jobs: log experiments with zero friction, ask "why did val loss spike?", find similar past failures.

### P2 — ML Team Lead ("Tomás")
Owns 3–8 concurrent projects. Frustrated by: no cross-experiment institutional memory, onboarding new engineers taking weeks, decisions living in Slack threads.
Primary jobs: see project evolution at a glance, get AI-generated explanations for regressions, enforce access control.

### P3 — Research Scientist ("Priya")
Reads papers, prototypes in notebooks. Frustrated by: papers disconnected from the experiments they inspired, notebook insights evaporating.
Primary jobs: upload papers/notebooks and have them indexed into project knowledge, ask literature-grounded questions in project context.

---

## 3. Jobs-to-be-Done

1. **Record** — capture experiments, datasets, models, and code context with minimal ceremony (API keys + SDK-style REST, MLflow import, GitHub sync).
2. **Remember** — persist every artifact and decision into Project Memory automatically via event sourcing.
3. **Reason** — investigate metric changes across code, data, and configuration and produce cited explanations.
4. **Retrieve** — hybrid search (semantic + keyword + graph) across everything the project has ever known.
5. **Converse** — streaming AI chat scoped to a project, powered by a multi-agent system with memory access.

---

## 4. Feature Matrix

### V1 — Fully implemented

| # | Feature | Description |
|---|---|---|
| 1 | Authentication | Email/password, JWT access + rotating refresh tokens |
| 2 | API Keys | Hashed, scoped, revocable keys for programmatic access |
| 3 | RBAC | Per-project roles: owner / admin / member / viewer |
| 4 | Projects | Workspaces owning all artifacts and memory |
| 5 | Datasets | Versioned datasets with MinIO object storage |
| 6 | Dataset Analyzer | Profiling, quality checks, leakage heuristics (first-party plugin) |
| 7 | Experiments | Runs with hyperparameters, metrics, statuses, artifacts |
| 8 | Experiment Timeline | Chronological, event-sourced project narrative |
| 9 | Notebook Upload | `.ipynb` parsing → cells indexed into memory + graph |
| 10 | Research Paper Upload | PDF parsing → chunks embedded, linked to project |
| 11 | GitHub Integration | Commit / PR / issue sync via MCP; linked to experiments |
| 12 | MLflow Integration | One-way import of runs, params, metrics via MCP |
| 13 | Knowledge Graph | Neo4j graph over all artifacts; visual + queryable |
| 14 | Hybrid Search | Vector + keyword + graph expansion with RRF fusion |
| 15 | Streaming AI Chat | SSE chat through the LangGraph coordinator |
| 16 | Project Memory | Typed memory records: facts, decisions, failures, insights |
| 17 | Investigation Engine | Evidence-cited WHY explanations for metric changes |

### V2 / V3 — Architecture only (complete contracts, no business logic)

| Feature | Scope generated |
|---|---|
| Teams | Models, invitations contract, service interface, routes |
| Billing | Plan/subscription/usage models, provider interface, routes |
| Notifications | Channel abstraction, preference models, delivery interface |
| Audit Logs | Immutable audit record model, query contract |
| Model Cards | Card schema, generation service interface |
| Documentation Generator | Doc job contract, template interface |
| Capability Registry | Runtime gate: disabled capabilities return typed `501 CapabilityNotEnabled` |

---

## 5. Non-Goals (V1)

- Training orchestration or compute management (we observe training; we do not run it).
- Real-time collaborative editing.
- Mobile applications.
- On-the-fly model serving/inference hosting.
- Fine-tuning custom LLMs.

---

## 6. Success Metrics

| Metric | Target |
|---|---|
| Time from signup → first logged experiment | < 10 minutes |
| Investigation produced for a metric change | < 60 s (async), every claim cites ≥ 1 evidence record |
| Memory retrieval precision (top-5 relevant) | ≥ 80% on seed benchmark |
| "Why" questions answerable in chat | Grounded answer w/ citations or explicit "insufficient evidence" |
| Cold start (`docker compose up` → usable) | < 3 minutes, one command |

---

## 7. Constraints & Principles

1. **Provider independence** — no code path may depend on a specific LLM vendor; Anthropic Claude is the default *configuration*, not a dependency.
2. **Event sourcing** — every significant action is an immutable event; memory and graph are projections.
3. **Clean Architecture** — domain logic never imports infrastructure; controllers contain zero business logic.
4. **Extensibility** — integrations arrive via MCP; capabilities arrive via the plugin system; neither requires core changes.
5. **Production posture** — rate limiting, structured logging, validation, typed errors, tests from day one.
