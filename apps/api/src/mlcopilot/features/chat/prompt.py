"""PromptBuilder service for RAG system prompt formatting."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mlcopilot.domain.chat import ChatMessage, RetrievedChunk


class PromptBuilder:
    """Prompt assembler and formatter for RAG LLM queries."""

    @staticmethod
    def build_system_prompt(project_name: str) -> str:
        """Construct the system instruction prompt for RAG queries."""
        return (
            f"You are MLCopilot, an advanced AI copilot for the project '{project_name}'. "
            "You will be given a user question, a conversational history, and a list of "
            "context snippets retrieved from the project's knowledge base.\n\n"
            "Strict Instructions:\n"
            "1. Answer the user's question using ONLY the retrieved context snippets provided in "
            "the prompt. If the context does not contain the answer, state clearly: 'I cannot find "
            "the answer in the provided documents.' Do NOT extrapolate, guess, or speculate.\n"
            "2. Cite your sources in the text. Cite a source by appending `[Source ID]` where "
            "'Source ID' corresponds to the indices of the context snippets provided (e.g., [1], "
            "[2]). Every factual claim derived from context must be cited.\n"
            "3. Maintain a professional, concise, and technical tone. Use markdown tables, "
            "bullets, and code snippets when appropriate."
        )

    @staticmethod
    def build_user_prompt(
        question: str,
        retrieved_chunks: list[RetrievedChunk],
        history: list[ChatMessage],
    ) -> str:
        """Assemble context chunks, history, and new query into the final prompt."""
        # 1. Format context snippets
        context_lines = []
        for idx, chunk in enumerate(retrieved_chunks):
            context_lines.append(
                f"Source [{idx + 1}]:\n"
                f"  - Document: {chunk.filename}\n"
                f"  - Chunk ID: {chunk.chunk_id}\n"
                f"  - Match Score: {chunk.score:.4f}\n"
                f"  - Content:\n{chunk.content}\n"
            )
        context_str = (
            "\n".join(context_lines)
            if context_lines
            else "No documents ingested in this project yet."
        )

        # 2. Format conversation history
        history_lines = []
        for msg in history:
            role_label = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{role_label}: {msg.content}")
        history_str = (
            "\n".join(history_lines) if history_lines else "No prior history."
        )

        # 3. Combine into final prompt
        return (
            f"=== RETRIEVED CONTEXT ===\n{context_str}\n\n"
            f"=== CONVERSATIONAL HISTORY ===\n{history_str}\n\n"
            f"=== NEW QUESTION ===\nUser: {question}\n\n"
            "Assistant:"
        )
