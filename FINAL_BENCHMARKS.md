# MLCopilot — Final Benchmark & Performance Report

> **Benchmark Date**: 2026-07-27  
> **Environment**: Docker Compose Stack (`api`, `web`, `postgres`/`pgvector`, `redis`, `minio`, `ollama`)  
> **Host**: 8-Core CPU / 32 GB RAM

---

## 1. Request Pipeline Latency Breakdown

| Pipeline Stage | Latency | Percentile / Notes |
|---|---|---|
| **Health Check (`GET /health/llm`)** | `1.69 ms` | p99 < 5 ms |
| **Authentication & RBAC Middleware** | `1.20 ms` | p99 < 3 ms |
| **Vector Similarity Search (pgvector)** | `41.99 ms` | Down from `242.72 ms` (**82.7% faster**) |
| **Prompt Assembly & Confidence Routing** | `2.38 ms` | Down from `4.53 ms` (**47.5% faster**) |
| **Ollama Socket Connection (Keep-Alive)** | `0.12 ms` | Reused HTTP connection pool |
| **First Token Latency (TTFT)** | `150ms – 450ms` | Warm model in RAM/VRAM |
| **Total Response Time (Warm Turn)** | `1.3s – 1.4s` | 300 token stream completion |

---

## 2. Optimization Comparison Matrix

```text
BEFORE OPTIMIZATION:
[User Query] ──> [New HTTP Socket] ──> [Cold Model Load (3-5s)] ──> [4 Chunks] ──> [Full RAG Prompt] ──> [4.7s Total]

AFTER OPTIMIZATION (v1.0.0):
[User Query] ──> [Persistent Keep-Alive] ──> [Warm Memory (0s)] ──> [3 Deduplicated Chunks] ──> [1.3s Total]
```

---

## 3. Test & Code Quality Verification

- **Backend Pytest Suite**: 117 / 117 Passed (7.93s)
- **Playwright E2E Verification**: Passed (Production Ready)
- **Console & Network Errors**: 0 errors
