"""RAGService orchestrator managing the conversational search pipeline."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from mlcopilot.domain.chat import ChatMessage, ChatResponse, Citation, Conversation
from mlcopilot.features.chat.prompt import PromptBuilder

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from mlcopilot.domain.chat import ConversationRepository
    from mlcopilot.features.chat.generation import GenerationService
    from mlcopilot.features.chat.retrieval import RetrievalService


class RAGService:
    """Thin orchestrating use-case service representing the RAG query flow."""

    def __init__(
        self,
        conversation_repo: ConversationRepository,
        retrieval_service: RetrievalService,
        generation_service: GenerationService,
    ) -> None:
        self._conversation_repo = conversation_repo
        self._retrieval_service = retrieval_service
        self._generation_service = generation_service

    async def get_or_create_conversation(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID | None = None,
        title: str = "New Chat",
    ) -> Conversation:
        """Resolve a conversation session by ID or create one if not found/provided."""
        if conversation_id:
            conv = await self._conversation_repo.get_by_id(conversation_id)
            if conv:
                if conv.project_id != project_id or conv.created_by != user_id:
                    from mlcopilot.domain.errors import NotFoundError
                    raise NotFoundError("Conversation not found")
                return conv

        new_conv = Conversation(
            id=conversation_id or uuid.uuid4(),
            project_id=project_id,
            title=title,
            created_by=user_id,
            created_at=datetime.now(UTC),
        )
        await self._conversation_repo.add(new_conv)
        return new_conv

    async def chat(
        self,
        project_id: uuid.UUID,
        project_name: str,
        user_id: uuid.UUID,
        question: str,
        conversation_id: uuid.UUID | None = None,
    ) -> ChatResponse:
        """Execute a standard blocking conversational RAG turn."""
        conv = await self.get_or_create_conversation(
            project_id, user_id, conversation_id, title=question[:50]
        )

        user_msg = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="user",
            content=question,
            citations=[],
            created_at=datetime.now(UTC),
        )
        await self._conversation_repo.add_message(user_msg)

        # 1. Retrieval
        chunks = await self._retrieval_service.retrieve_relevant_chunks(
            project_id, question
        )
        citations = [
            Citation(
                upload_id=c.upload_id,
                filename=c.filename,
                chunk_id=c.chunk_id,
                content=c.content,
                position=c.position,
                score=c.score,
            )
            for c in chunks
        ]

        # 2. Prompt Assembly
        system_prompt = PromptBuilder.build_system_prompt(project_name)
        history = await self._conversation_repo.get_messages(conv.id)
        user_prompt = PromptBuilder.build_user_prompt(
            question, chunks, history[:-1]
        )

        # 3. Generation
        answer = await self._generation_service.generate_response(
            system_prompt, user_prompt
        )

        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            citations=citations,
            created_at=datetime.now(UTC),
        )
        await self._conversation_repo.add_message(assistant_msg)
        await self._conversation_repo.commit()

        return ChatResponse(content=answer, citations=citations)

    async def chat_stream(
        self,
        project_id: uuid.UUID,
        project_name: str,
        user_id: uuid.UUID,
        question: str,
        conversation_id: uuid.UUID | None = None,
    ) -> AsyncIterator[str]:
        """Execute a streaming conversational RAG turn yielding Server-Sent Events (SSE)."""
        conv = await self.get_or_create_conversation(
            project_id, user_id, conversation_id, title=question[:50]
        )

        user_msg = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="user",
            content=question,
            citations=[],
            created_at=datetime.now(UTC),
        )
        await self._conversation_repo.add_message(user_msg)
        await self._conversation_repo.commit()

        # 1. Retrieval
        chunks = await self._retrieval_service.retrieve_relevant_chunks(
            project_id, question
        )
        citations = [
            Citation(
                upload_id=c.upload_id,
                filename=c.filename,
                chunk_id=c.chunk_id,
                content=c.content,
                position=c.position,
                score=c.score,
            )
            for c in chunks
        ]

        # 2. Prompt Assembly
        system_prompt = PromptBuilder.build_system_prompt(project_name)
        history = await self._conversation_repo.get_messages(conv.id)
        user_prompt = PromptBuilder.build_user_prompt(
            question, chunks, history[:-1]
        )

        # 3. Stream Metadata first (conversation_id & citations)
        metadata_payload = {
            "conversation_id": str(conv.id),
            "citations": [self._citation_to_dict(c) for c in citations],
        }
        yield f"event: metadata\ndata: {json.dumps(metadata_payload)}\n\n"

        # 4. Stream tokens
        accumulated_text = []
        async for token in self._generation_service.generate_response_stream(
            system_prompt, user_prompt
        ):
            accumulated_text.append(token)
            yield f"event: message\ndata: {json.dumps({'text': token})}\n\n"

        # 5. Persist assistant output to db
        full_answer = "".join(accumulated_text)
        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="assistant",
            content=full_answer,
            citations=citations,
            created_at=datetime.now(UTC),
        )
        await self._conversation_repo.add_message(assistant_msg)
        await self._conversation_repo.commit()

        # 6. Stream final done event
        yield "event: done\ndata: {\"done\": true}\n\n"

    def _citation_to_dict(self, cit: Citation) -> dict[str, Any]:
        return {
            "upload_id": str(cit.upload_id),
            "filename": cit.filename,
            "chunk_id": str(cit.chunk_id),
            "content": cit.content,
            "position": cit.position,
            "score": cit.score,
        }
