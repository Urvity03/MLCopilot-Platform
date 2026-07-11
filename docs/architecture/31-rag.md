# 31 — Retrieval-Augmented Generation (RAG)

# Overview

Retrieval-Augmented Generation (RAG) is the core application logic that enables users to query their document repositories. 

### Purpose
To combine vector search (similarity query) with natural language generation, providing answers grounded in the project's knowledge base.

### Responsibilities
- **Semantic Retrieval**: Querying the database to fetch chunks matching the user's question.
- **Context Synthesis**: Formatting retrieved chunks and metadata (document filename, position) into structured prompt segments.
- **History Assembly**: Appending conversational history to maintain conversational context.
- **System Prompt Formatting**: Enforcing strict output rules, such as generating matching inline citations (e.g. `[Source ID]`) and avoiding extrapolation.
- **LLM Execution**: Orchestrating calls to the LLM (OpenAI) to generate the final response.

### Where it fits in the architecture
RAG is an orchestration flow managed by the `features/chat/` feature module. It sits at the application layer (`RAGService`), bridging the domain layer protocols (`LLMProvider`) and infrastructure (OpenAI client, pgvector databases).

---

# Architecture

RAG uses a decoupled design where prompt formatting, document retrieval, and LLM text generation are managed by dedicated services.

```
                   POST /projects/{id}/chat
                             │
                             ▼
                    RAGService (Orchestrator)
                  /     │          │        \
                 /      │          │         \
                ▼       ▼          ▼          ▼
   RetrievalService  PromptBuilder  GenerationService  ConversationRepository
      (pgvector)       (Prompts)         (LLM)              (Database)
```

### Components and Dependency Flow
1. **`RetrievalService`**: Handles semantic retrieval. It embeds the user question and queries pgvector.
2. **`PromptBuilder`**: Assembles the LLM prompts.
3. **`GenerationService`**: Orchestrates text generation.
4. **`RAGService`**: The core orchestrator. It receives requests, fetches database context, invokes services, and saves conversation state.

---

# Data Flow

The RAG workflow processes query inputs through the following lifecycle:

```
[User Question]
      │
      ▼
1. Retrieval ──> Call RetrievalService ──> [Query Vector] ──> pgvector Cosine similarity
                                                                     │
                                                                     ▼
                                                             list[RetrievedChunk]
                                                                     │
      ┌──────────────────────────────────────────────────────────────┘
      ▼
2. Prompt Building ──> Call PromptBuilder ──> Form System Prompt (Project rules)
                                          ──> Form User Prompt (Chunks + History + Query)
                                                                     │
      ┌──────────────────────────────────────────────────────────────┘
      ▼
3. Generation ──> Call GenerationService ──> OpenAI Chat Completions API
                                                             │
                                                    (Stream / Blocking)
                                                             ▼
4. Output ──> Stream SSE tokens & persist completed response to Database (with citations)
```

---

# Mermaid Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as ChatRouter
    participant RAG as RAGService
    participant Retrieve as RetrievalService
    participant Prompt as PromptBuilder
    participant Generate as GenerationService
    participant LLM as OpenAIProvider
    participant DB as SqlAlchemyConversationRepository

    User->>Router: POST /projects/{id}/chat (question, conversation_id, stream=True)
    Note over Router: Enforces require_project_role
    Router->>RAG: chat_stream(project_id, project_name, user_id, question, conversation_id)
    
    RAG->>DB: get_or_create_conversation(conversation_id)
    DB-->>RAG: Conversation Entity
    
    RAG->>DB: add_message(User Message)
    RAG->>DB: commit()
    
    RAG->>Retrieve: retrieve_relevant_chunks(project_id, question)
    Note over Retrieve: Embeds question & queries pgvector
    Retrieve-->>RAG: list[RetrievedChunk]
    
    RAG->>Prompt: build_system_prompt(project_name)
    Prompt-->>RAG: system_prompt_str
    
    RAG->>DB: get_messages(conversation_id)
    DB-->>RAG: list[ChatMessage] (prior history)
    
    RAG->>Prompt: build_user_prompt(question, chunks, history)
    Prompt-->>RAG: user_prompt_str
    
    RAG->>Router: yield SSE event: metadata (citations & conversation_id)
    Router-->>User: SSE Event "metadata"
    
    RAG->>Generate: generate_response_stream(system_prompt, user_prompt)
    Generate->>LLM: generate_stream(system_prompt, user_prompt)
    
    loop Stream response tokens
        LLM-->>Generate: token
        Generate-->>RAG: token
        RAG->>Router: yield SSE event: message (token text)
        Router-->>User: SSE Event "message"
    end
    
    RAG->>DB: add_message(Assistant Response with Citations)
    RAG->>DB: commit()
    
    RAG->>Router: yield SSE event: done
    Router-->>User: SSE Event "done"
```

---

# Important Classes

### `RAGService`
- **Path**: `src/mlcopilot/features/chat/service.py`
- **Responsibility**: Orchestrates the RAG workflow, coordinating data flow between components.

### `RetrievalService`
- **Path**: `src/mlcopilot/features/chat/retrieval.py`
- **Responsibility**: Converts questions into embeddings and queries pgvector.

### `PromptBuilder`
- **Path**: `src/mlcopilot/features/chat/prompt.py`
- **Responsibility**: Assembles system and user prompts, formatting history context and chunks.

### `GenerationService`
- **Path**: `src/mlcopilot/features/chat/generation.py`
- **Responsibility**: Manages LLM completions, wrapping blocking calls and generators.

### `OpenAIProvider`
- **Path**: `src/mlcopilot/infrastructure/llm/openai.py`
- **Responsibility**: Concrete `LLMProvider` implementation. Interacts with the OpenAI SDK.

---

# API Integration

- **`POST /api/v1/projects/{project_id}/chat`**: Evaluates conversational queries.
  - If `stream` is `True`, returns a Starlette `StreamingResponse` (media-type: `text/event-stream; charset=utf-8`).
  - If `stream` is `False`, returns a JSON object containing the complete response text and citation models.

---

# Security

- **Authorization**: All RAG endpoints require a valid JWT token. Access to a project's knowledge base is restricted to project members via `require_project_role(Role.VIEWER)`.
- **Tenant Isolation**: Queries are isolated at the retrieval step by filtering on `project_id`.
- **Conversation Ownership**: `RAGService` enforces ownership and project isolation on conversation IDs, raising a `NotFoundError` if a user attempts to access a conversation from another project or user.

---

# Design Decisions

- **Vendor Decoupling**: Application services interact with the LLM through the `LLMProvider` interface protocol.
  - *Rationale*: Allows swapping the LLM provider (e.g. from OpenAI to Anthropic or local models) without modifying the application code.
- **Strict Prompt Instructions**: System prompts instruct the LLM to use only the provided context. If the answer is missing, it must return: *"I cannot find the answer in the provided documents."*
- **Citational Grounding**: Prompts enforce inline citations (`[Source ID]`). This grounds the model's outputs and helps prevent hallucinations.

---

# Future Improvements

- **Reranking**: Integrate a cross-encoder model to re-rank the retrieved chunks before prompt building.
- **Metadata Filtering**: Support filtering source documents by metadata (e.g., date, category) during semantic retrieval.
- **Guardrails**: Implement pre-retrieval and post-generation guardrails to block unsafe queries or outputs.
