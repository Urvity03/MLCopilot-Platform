# 03 — Domain Model

## Aggregates & Entities

| Aggregate root | Entities inside | Key invariants |
|---|---|---|
| **User** | — | unique email; password always hashed; soft-deactivate only |
| **ApiKey** | — | belongs to user; stores hash only; scopes ⊆ owner permissions; revocation is terminal |
| **Project** | ProjectMember | exactly one `owner`; owner cannot be demoted/removed while owner; slug unique |
| **Dataset** | DatasetVersion, AnalysisReport | versions append-only and monotonically numbered; storage URI immutable once written |
| **Experiment** | MetricPoint, HyperparameterSet | status machine: `created → running → (completed \| failed \| aborted)`; metrics only recordable while `running`; hyperparameters frozen at start |
| **Model** | — | registered from a `completed` experiment only |
| **Upload** (Notebook / Paper) | ParsedChunk | parse status machine: `pending → parsing → (parsed \| failed)` |
| **MemoryRecord** | — | immutable after creation; must reference ≥ 1 source artifact; typed kind |
| **Investigation** | EvidenceItem, Explanation | every explanation claim must cite ≥ 1 EvidenceItem; status `pending → collecting → reasoning → (completed \| failed)` |
| **ChatSession** | ChatMessage | messages append-only; session bound to one project |
| **IntegrationLink** (GitHub / MLflow) | SyncedCommit, SyncedRun | sync cursor monotonic; re-sync idempotent |

V2/V3 aggregates (models + contracts only): **Team**, **Subscription**, **Notification**, **AuditRecord**, **ModelCard**, **GeneratedDocument**.

## Value Objects

| Value | Definition |
|---|---|
| `Role` | enum: `owner`, `admin`, `member`, `viewer` (ordered, comparable) |
| `ApiKeyScope` | enum: `read`, `write`, `admin` |
| `ExperimentStatus` | enum with legal-transition table embedded |
| `MetricValue` | name + float + step + timestamp; NaN/Inf rejected |
| `MemoryKind` | enum: `fact`, `decision`, `failure`, `insight` |
| `EvidenceKind` | enum: `git_diff`, `hparam_delta`, `dataset_change`, `notebook_output`, `training_log`, `prior_experiment`, `memory_record` |
| `ArtifactRef` | typed reference `(artifact_type, artifact_id)` used by memory/graph/evidence |
| `EmbeddingVector` | dimension-checked float sequence |
| `Cursor` / `Page[T]` | opaque cursor pagination primitives |

## Domain Events (catalog)

Emitted by aggregates, persisted in the event store, fanned out via the outbox:

```
UserRegistered
ProjectCreated, ProjectMemberAdded, ProjectMemberRoleChanged, ProjectMemberRemoved
DatasetCreated, DatasetVersionUploaded, DatasetAnalysisCompleted
ExperimentStarted, ExperimentMetricRecorded, ExperimentCompleted,
ExperimentFailed, ExperimentAborted, MetricChanged            # significant delta vs baseline
ModelRegistered
NotebookUploaded, NotebookParsed, PaperUploaded, PaperParsed
GitCommitIndexed, PullRequestIndexed, IssueIndexed, MLflowRunImported
MemoryRecordCreated
InvestigationRequested, InvestigationCompleted
ChatMessageSent, AIConversationCompleted
DocumentationGenerated                                        # V2/V3 reserved
```

Every event carries the envelope defined in [08-event-store.md](08-event-store.md): `id`, `type`, `version`, `occurred_at`, `actor_id`, `project_id`, `aggregate_type`, `aggregate_id`, `payload`.

## Entity style

Domain entities are frozen-by-discipline dataclasses with behavior methods that return events:

```python
@dataclass
class Experiment:
    id: UUID
    project_id: UUID
    status: ExperimentStatus
    ...
    _events: list[DomainEvent] = field(default_factory=list, repr=False)

    def complete(self, at: datetime) -> None:
        self.status = self.status.transition_to(ExperimentStatus.COMPLETED)  # raises IllegalTransition
        self._events.append(ExperimentCompleted(experiment_id=self.id, at=at))
```

Services collect `entity.events` into the Unit of Work; the entity never touches persistence.

## Error hierarchy

```
DomainError
├── NotFoundError
├── PermissionDeniedError
├── ConflictError            # uniqueness, illegal state transition
├── ValidationError          # domain-level (beyond schema validation)
└── CapabilityDisabledError  # V2/V3 gate → HTTP 501
```

One exception handler in `core/exceptions.py` maps these to the API error envelope.
