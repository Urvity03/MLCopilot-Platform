# 14 — AI Provider Architecture

## Hard rule

**No code outside `ai/providers/` may import a vendor SDK.** Agents, services, and workers depend only on the protocols below. Anthropic Claude is the *default configuration*, never a dependency.

## Protocols

```python
class LLMProvider(Protocol):
    name: str

    async def complete(self, req: CompletionRequest) -> CompletionResponse: ...
    async def stream(self, req: CompletionRequest) -> AsyncIterator[StreamChunk]: ...
    async def complete_structured(
        self, req: CompletionRequest, schema: type[BaseModel]
    ) -> BaseModel: ...

class EmbeddingProvider(Protocol):
    name: str
    dimensions: int
    async def embed(self, texts: Sequence[str]) -> list[list[float]]: ...
```

`CompletionRequest` is provider-neutral: `messages` (typed roles), `system`, `tools` (JSON-schema tool specs), `temperature`, `max_tokens`, `metadata` (trace ids). Each implementation translates to its vendor format, including tool-call shapes.

## Implementations

| Provider | Package | Structured output strategy |
|---|---|---|
| `anthropic` (default) | `anthropic` | tool-use forced single tool |
| `openai` | `openai` | `response_format: json_schema` |
| `gemini` | `google-genai` | `response_schema` |
| `ollama` | `httpx` (native API) | JSON mode + Pydantic validation w/ single repair retry |
| `openrouter` | `httpx` (OpenAI-compatible) | as OpenAI |

All implementations share: timeout handling, typed error mapping (`ProviderRateLimited`, `ProviderUnavailable`, `ProviderResponseInvalid`), token usage extraction, and structlog tracing.

## Registry & configuration

```
AI_DEFAULT_PROVIDER=anthropic
AI_DEFAULT_MODEL=claude-sonnet-4-5
AI_FALLBACK_CHAIN=anthropic,openai            # optional
AI_AGENT_MODELS__investigation=claude-opus-4-6 # optional per-agent override
EMBEDDING_PROVIDER=...
EMBEDDING_DIMENSIONS=1024
```

`ProviderRegistry` builds providers lazily from settings; misconfigured providers fail at boot (fail-fast) with actionable messages. `FallbackProvider` wraps the chain: on `ProviderUnavailable`/`ProviderRateLimited` it advances to the next provider and logs the failover.

Per-agent resolution order: agent-specific override → default provider/model.

## Testing

`FakeLLMProvider` (in `tests/`) implements the full protocol with scripted responses and recorded requests — every agent test runs without network or vendor keys. See [27-testing.md](27-testing.md).
