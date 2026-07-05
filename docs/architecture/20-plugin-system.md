# 20 — Plugin System

## Principles

1. **Core never imports plugins.** Plugins import the SDK (`mlcopilot.plugins`); discovery is inverted via Python entry points.
2. Every extension point is a typed protocol; registration is validated at load time; a broken plugin degrades (logged, skipped) — never crashes the platform.

## Discovery

Plugins are installed Python packages exposing an entry point:

```toml
[project.entry-points."mlcopilot.plugins"]
my_plugin = "my_plugin:plugin"
```

At startup, `PluginManager.load()` iterates `importlib.metadata.entry_points(group="mlcopilot.plugins")`, resolves each `Plugin` object, validates its manifest, and registers its contributions.

## Manifest & contributions

```python
plugin = Plugin(
    manifest=PluginManifest(
        name="advanced-analyzers", version="1.0.0",
        min_core="1.0", description="…",
    ),
    contributions=Contributions(
        agents=[…],            # AgentContribution: name, build(graph_deps) -> node
        integrations=[…],      # MCP server definitions
        jobs=[…],              # JobContribution: schedule + task
        commands=[…],          # CommandContribution: palette-visible actions
        dataset_analyzers=[…], # DatasetAnalyzer protocol impls
        evaluators=[…],        # ModelEvaluator protocol impls
        visualizations=[…],    # VisualizationContribution: data endpoint contract
        ui_panels=[…],         # UIPanelContribution: slot + remote schema
    ),
)
```

## Extension-point protocols (SDK)

```python
class DatasetAnalyzer(Protocol):
    id: str                    # 'core.profile', 'acme.drift'
    name: str
    async def analyze(self, ctx: AnalyzerContext) -> AnalysisReport: ...

class ModelEvaluator(Protocol):
    id: str
    async def evaluate(self, ctx: EvaluationContext) -> EvaluationReport: ...
```

`AnalyzerContext` provides read-only accessors (dataset stream from MinIO, schema summary, prior reports) — plugins never receive raw DB sessions.

## Registries

Each contribution type has a registry consumed by exactly one core seam:

| Registry | Core consumer |
|---|---|
| analyzers | `features/datasets` analysis service + `analysis` queue |
| agents | Planner's specialist catalog ([15](15-langgraph-agents.md)) |
| integrations | MCP server registry ([16](16-mcp.md)) |
| jobs | Celery Beat schedule assembly |
| commands | `/commands` endpoint → command palette |
| evaluators / visualizations / ui_panels | experiment detail + panel slots |

## First-party proof

The built-in **Dataset Analyzer** ships as a first-party plugin (`mlcopilot.plugins.builtin.dataset_analyzer`) registered through the same entry-point mechanism — guaranteeing the extension point genuinely works and stays honest.
