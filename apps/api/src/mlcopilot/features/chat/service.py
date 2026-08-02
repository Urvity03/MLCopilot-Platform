"""RAGService orchestrator managing the conversational search pipeline."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from mlcopilot.core.config import get_settings
from mlcopilot.domain.chat import ChatMessage, ChatResponse, Citation, Conversation
from mlcopilot.features.chat.prompt import PromptBuilder

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from mlcopilot.domain.chat import ConversationRepository
    from mlcopilot.features.chat.generation import GenerationService
    from mlcopilot.features.chat.retrieval import RetrievalService


class RAGService:
    """Thin orchestrating use-case service representing the hybrid RAG/Conversational query flow."""

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

        settings = get_settings()
        raw_chunks = await self._retrieval_service.retrieve_relevant_chunks(
            project_id, question, top_k=settings.rag_max_chunks
        )

        # Confidence routing threshold check
        threshold = settings.rag_similarity_threshold
        relevant_chunks = [c for c in raw_chunks if c.score >= threshold]

        if relevant_chunks:
            citations = [
                Citation(
                    upload_id=c.upload_id,
                    filename=c.filename,
                    chunk_id=c.chunk_id,
                    content=c.content,
                    position=c.position,
                    score=c.score,
                )
                for c in relevant_chunks
            ]
            system_prompt = PromptBuilder.build_system_prompt(project_name)
            user_prompt = PromptBuilder.build_user_prompt(
                question, relevant_chunks, [], is_rag_mode=True
            )
        else:
            citations = []
            system_prompt = PromptBuilder.build_conversational_system_prompt(project_name)
            user_prompt = PromptBuilder.build_user_prompt(
                question, [], [], is_rag_mode=False
            )

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

        settings = get_settings()
        start_time = datetime.now(UTC)

        # 1. AI Intent Classification (GENERAL vs DOCUMENT)
        from mlcopilot.features.chat.intent import IntentRouter
        intent_router = IntentRouter(self._generation_service._llm_provider)
        intent = await intent_router.classify_intent(question, has_documents=True)

        raw_chunks = []
        retrieval_ms = 0.0

        if intent == "DOCUMENT":
            t_retrieval_start = datetime.now(UTC)
            raw_chunks = await self._retrieval_service.retrieve_relevant_chunks(
                project_id, question, top_k=settings.rag_max_chunks
            )
            retrieval_ms = round((datetime.now(UTC) - t_retrieval_start).total_seconds() * 1000, 2)

        # 2. Confidence Routing (threshold check)
        threshold = settings.rag_similarity_threshold
        relevant_chunks = [c for c in raw_chunks if c.score >= threshold]

        t_prompt_start = datetime.now(UTC)
        history = await self._conversation_repo.get_messages(conv.id)

        if intent == "DOCUMENT" and relevant_chunks:
            is_rag_mode = True
            citations = [
                Citation(
                    upload_id=c.upload_id,
                    filename=c.filename,
                    chunk_id=c.chunk_id,
                    content=c.content,
                    position=c.position,
                    score=c.score,
                )
                for c in relevant_chunks
            ]
            system_prompt = PromptBuilder.build_system_prompt(project_name)
            user_prompt = PromptBuilder.build_user_prompt(
                question, relevant_chunks, history[:-1], is_rag_mode=True
            )
        else:
            # Fallback to General AI Mode
            is_rag_mode = False
            citations = []
            system_prompt = PromptBuilder.build_conversational_system_prompt(project_name)
            user_prompt = PromptBuilder.build_user_prompt(
                question, [], history[:-1], is_rag_mode=False
            )

        prompt_build_ms = round((datetime.now(UTC) - t_prompt_start).total_seconds() * 1000, 2)

        # 3. Structured RAG Debug Logging
        provider_name = getattr(self._generation_service._llm_provider, "_model_name", "configured_llm")
        from mlcopilot.core.logging import get_logger
        logger = get_logger("mlcopilot.features.chat.service")
        logger.info(
            "rag.query_debug",
            question=question,
            is_rag_mode=is_rag_mode,
            retrieved_count=len(relevant_chunks),
            raw_retrieved_count=len(raw_chunks),
            similarity_scores=[round(c.score, 4) for c in relevant_chunks],
            provider=provider_name,
            retrieval_ms=retrieval_ms,
            prompt_build_ms=prompt_build_ms,
        )

        # 4. Stream Metadata Event first (contains conversation_id & citations if RAG used)
        metadata_payload = {
            "conversation_id": str(conv.id),
            "citations": [self._citation_to_dict(c) for c in citations],
            "is_rag_mode": is_rag_mode,
        }
        metadata_sse = f"event: metadata\ndata: {json.dumps(metadata_payload)}\n\n"
        yield metadata_sse

        # 5. Stream Tokens & measure first-token latency
        accumulated_text = []
        t_llm_start = datetime.now(UTC)
        first_token_ms: float | None = None

        try:
            async for token in self._generation_service.generate_response_stream(
                system_prompt, user_prompt
            ):
                if first_token_ms is None:
                    first_token_ms = round((datetime.now(UTC) - t_llm_start).total_seconds() * 1000, 2)

                accumulated_text.append(token)
                msg_sse = f"event: message\ndata: {json.dumps({'text': token})}\n\n"
                yield msg_sse
        except Exception as e:
            logger.error("chat.stream_generation.error", error_type=type(e).__name__, details=str(e))
            err_msg = str(e) or "LLM token generation failed."
            err_sse = f"event: error\ndata: {json.dumps({'error': {'message': err_msg}})}\n\n"
            yield err_sse
            return

        # 6. Metrics calculation & logging
        total_ms = round((datetime.now(UTC) - start_time).total_seconds() * 1000, 2)
        streaming_ms = round((datetime.now(UTC) - t_llm_start).total_seconds() * 1000, 2)
        first_token_ms = first_token_ms or streaming_ms

        logger.info(
            "rag.performance_metrics",
            is_rag_mode=is_rag_mode,
            retrieval_ms=retrieval_ms,
            prompt_build_ms=prompt_build_ms,
            first_token_ms=first_token_ms,
            streaming_ms=streaming_ms,
            total_ms=total_ms,
        )

        # 7. Persist Assistant Response in DB
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

        # 8. Final Done Event
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
