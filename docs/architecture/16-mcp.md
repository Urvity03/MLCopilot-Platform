# 16 — MCP Architecture

## Purpose

All external-system access for agents flows through the **Model Context Protocol**. Integrations become configuration, not code: adding an MCP server never changes agent logic.

## Layers

```
ai/mcp/
├── client.py        # MCPClient: connect (stdio | HTTP), list_tools, call_tool, health
├── registry.py      # MCPServerRegistry: config-driven server definitions + lifecycle
├── adapter.py       # AgentToolAdapter: MCP tools → provider-neutral tool specs
└── permissions.py   # per-agent tool allow-lists
```

### Server registry

Servers are declared in configuration (env / `mcp.yaml`), not code:

```yaml
servers:
  github:     { transport: stdio, command: "mcp-server-github",  env: [GITHUB_TOKEN] }
  filesystem: { transport: stdio, command: "mcp-server-filesystem", args: ["/workspace"] }
  postgres:   { transport: stdio, command: "mcp-server-postgres", env: [DATABASE_URL], readonly: true }
  neo4j:      { transport: stdio, command: "mcp-server-neo4j",    env: [NEO4J_URI, NEO4J_AUTH], readonly: true }
  mlflow:     { transport: http,  url: "${MLFLOW_MCP_URL}" }
  docker:     { transport: stdio, command: "mcp-server-docker",   enabled: false }
  terminal:   { transport: stdio, command: "mcp-server-terminal", enabled: false }
  browser:    { transport: stdio, command: "mcp-server-browser",  enabled: false }
```

`enabled: false` servers register but do not start — operators opt in (docker/terminal/browser are powerful and disabled by default).

### Tool adapter

`AgentToolAdapter` fetches each server's tool list, namespaces tools (`github.get_commit`), converts JSON-schema definitions into the provider-neutral `ToolSpec` used by `CompletionRequest`, and routes tool-call responses back through `MCPClient.call_tool`. Agents see one uniform tool interface whether a tool is an MCP tool or an internal function tool (memory search, metric query) — internal tools implement the same `ToolSpec` shape.

### Permissions

`permissions.py` maps agent → allowed tool patterns:

```python
AGENT_TOOLS = {
    "github":        ["github.*"],
    "dataset":       ["filesystem.read*", "internal.dataset.*", "internal.analyzer.*"],
    "search":        ["internal.search.*", "neo4j.read*"],
    "investigation": ["github.get_*", "internal.*", "neo4j.read*"],
    # …
}
```

The adapter materializes each agent's tool list from these patterns at graph build time — an agent physically cannot call a tool outside its allow-list.

## Failure semantics

- Server unavailable at boot: log warning, mark degraded, expose in `/health/ready` details; agents get a typed `ToolUnavailable` result rather than a crash.
- Tool call errors surface to the agent as structured error results so the LLM can adapt (retry, alternative tool, or "insufficient evidence").

## Pluggability

Adding a server = adding a YAML entry (+ secret). Plugins may also contribute server definitions through the `integrations` extension point ([20](20-plugin-system.md)).
