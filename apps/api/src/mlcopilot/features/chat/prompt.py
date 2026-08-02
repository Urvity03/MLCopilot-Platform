"""PromptBuilder service for RAG & general conversational system prompt formatting."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mlcopilot.domain.chat import ChatMessage, RetrievedChunk


class PromptBuilder:
    """Prompt assembler and formatter for RAG & conversational LLM queries."""

    @staticmethod
    def get_current_date_str() -> str:
        """Get formatted current date string server-side (e.g., 'Thursday, 30 July 2026')."""
        return datetime.now(UTC).strftime("%A, %d %B %Y")

    @classmethod
    def build_system_prompt(cls, project_name: str) -> str:
        """Construct the system instruction prompt for grounded RAG queries."""
        current_date = cls.get_current_date_str()
        return (
            f"You are MLCopilot, an advanced AI copilot for the project '{project_name}'. "
            f"Today's date is {current_date}.\n\n"
            "You will be given a user question, a conversational history, and a list of "
            "context snippets retrieved from the project's workspace documents.\n\n"
            "Operating Rules:\n"
            "1. Use retrieved workspace documents as the primary source whenever they are relevant.\n"
            "2. If the user's question is partially covered by the workspace documents:\n"
            "   - Answer the supported portion using citations in `[Source ID]` format (e.g., [1], [2]).\n"
            "   - Clearly identify which portion is not supported by the workspace documents.\n"
            "3. If the question is about the workspace and the answer is not present in the retrieved documents:\n"
            "   - State clearly that the information is not available in the workspace documents.\n"
            "   - Do not invent or hallucinate workspace-specific facts.\n"
            "4. If no relevant workspace context exists and the question is general knowledge or casual conversation:\n"
            "   - Answer normally using general knowledge.\n"
            "   - Do not fabricate citations.\n"
            "5. Use citations ONLY for statements that originate from retrieved workspace documents.\n"
            "6. Maintain a concise, professional, and helpful tone."
        )

    @classmethod
    def build_conversational_system_prompt(cls, project_name: str) -> str:
        """Construct system prompt for general questions when no document RAG context is used."""
        current_date = cls.get_current_date_str()
        return (
            f"You are MLCopilot, an advanced AI copilot for the project '{project_name}'. "
            f"Today's date is {current_date}.\n\n"
            "You are a helpful, intelligent, and knowledgeable AI assistant.\n\n"
            "Operating Rules:\n"
            "1. Answer general knowledge questions, programming queries, and conversational prompts accurately and naturally.\n"
            "2. Do not fabricate citations.\n"
            "3. If the user asks a workspace-specific question that requires documents not present in context, state clearly that the information is not available in the workspace documents.\n"
            "4. Maintain a concise, professional, and helpful tone."
        )

    @staticmethod
    def build_user_prompt(
        question: str,
        retrieved_chunks: list[RetrievedChunk],
        history: list[ChatMessage],
        is_rag_mode: bool = True,
    ) -> str:
        """Assemble context chunks, history, and new query into the final prompt."""
        # 1. Format conversation history
        history_lines = []
        for msg in history:
            role_label = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{role_label}: {msg.content}")
        history_str = (
            "\n".join(history_lines) if history_lines else "No prior history."
        )

        if is_rag_mode and retrieved_chunks:
            # Format RAG context snippets
            context_lines = []
            for idx, chunk in enumerate(retrieved_chunks):
                context_lines.append(
                    f"Source [{idx + 1}]:\n"
                    f"  - Document: {chunk.filename}\n"
                    f"  - Chunk ID: {chunk.chunk_id}\n"
                    f"  - Match Score: {chunk.score:.4f}\n"
                    f"  - Content:\n{chunk.content}\n"
                )
            context_str = "\n".join(context_lines)
            return (
                f"=== RETRIEVED CONTEXT ===\n{context_str}\n\n"
                f"=== CONVERSATIONAL HISTORY ===\n{history_str}\n\n"
                f"=== NEW QUESTION ===\nUser: {question}\n\n"
                "Assistant:"
            )

        # Conversational mode prompt (no context block)
        return (
            f"=== CONVERSATIONAL HISTORY ===\n{history_str}\n\n"
            f"=== NEW QUESTION ===\nUser: {question}\n\n"
            "Assistant:"
        )
