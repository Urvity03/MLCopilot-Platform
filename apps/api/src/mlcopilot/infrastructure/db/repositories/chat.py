"""SQLAlchemy implementation of the ConversationRepository protocol."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from mlcopilot.domain.chat import ChatMessage, Citation, Conversation
from mlcopilot.infrastructure.db.models.chat import ChatMessageModel, ConversationModel

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class SqlAlchemyConversationRepository:
    """SQLAlchemy implementation of the ConversationRepository protocol."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _citation_to_domain(self, raw: dict[str, Any]) -> Citation:
        return Citation(
            upload_id=uuid.UUID(raw["upload_id"]),
            filename=raw["filename"],
            chunk_id=uuid.UUID(raw["chunk_id"]),
            content=raw["content"],
            position=int(raw["position"]),
            score=float(raw["score"]),
        )

    def _citation_to_db(self, cit: Citation) -> dict[str, Any]:
        return {
            "upload_id": str(cit.upload_id),
            "filename": cit.filename,
            "chunk_id": str(cit.chunk_id),
            "content": cit.content,
            "position": cit.position,
            "score": cit.score,
        }

    def _message_to_domain(self, db_msg: ChatMessageModel) -> ChatMessage:
        citations = []
        if db_msg.citations:
            citations = [self._citation_to_domain(c) for c in db_msg.citations]
        return ChatMessage(
            id=db_msg.id,
            conversation_id=db_msg.conversation_id,
            role=db_msg.role,
            content=db_msg.content,
            citations=citations,
            created_at=db_msg.created_at,
        )

    def _conversation_to_domain(self, db_conv: ConversationModel) -> Conversation:
        messages = [self._message_to_domain(m) for m in db_conv.messages]
        return Conversation(
            id=db_conv.id,
            project_id=db_conv.project_id,
            title=db_conv.title,
            created_by=db_conv.created_by,
            created_at=db_conv.created_at,
            messages=messages,
        )

    async def get_by_id(self, conversation_id: uuid.UUID) -> Conversation | None:
        """Retrieve a conversation session and all its messages."""
        result = await self._session.execute(
            select(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .options(selectinload(ConversationModel.messages))
        )
        db_conv = result.scalar_one_or_none()
        if not db_conv:
            return None
        return self._conversation_to_domain(db_conv)

    async def list_by_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[Conversation]:
        """List all conversations belonging to a project and user, sorted by date."""
        result = await self._session.execute(
            select(ConversationModel)
            .where(
                ConversationModel.project_id == project_id,
                ConversationModel.created_by == user_id,
            )
            .options(selectinload(ConversationModel.messages))
            .order_by(ConversationModel.created_at.desc())
        )
        db_convs = result.scalars().all()
        return [self._conversation_to_domain(c) for c in db_convs]

    async def add(self, conversation: Conversation) -> None:
        """Persist a new conversation session."""
        db_conv = ConversationModel(
            id=conversation.id,
            project_id=conversation.project_id,
            title=conversation.title,
            created_by=conversation.created_by,
            created_at=conversation.created_at,
        )
        self._session.add(db_conv)
        for msg in conversation.messages:
            db_msg = ChatMessageModel(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                citations=[self._citation_to_db(c) for c in msg.citations]
                if msg.citations
                else None,
                created_at=msg.created_at,
            )
            self._session.add(db_msg)

    async def delete(self, conversation_id: uuid.UUID) -> None:
        """Delete a conversation session."""
        db_conv = await self._session.get(ConversationModel, conversation_id)
        if db_conv:
            await self._session.delete(db_conv)

    async def add_message(self, message: ChatMessage) -> None:
        """Persist a single chat message turn."""
        db_msg = ChatMessageModel(
            id=message.id,
            conversation_id=message.conversation_id,
            role=message.role,
            content=message.content,
            citations=[self._citation_to_db(c) for c in message.citations]
            if message.citations
            else None,
            created_at=message.created_at,
        )
        self._session.add(db_msg)

    async def get_messages(self, conversation_id: uuid.UUID) -> list[ChatMessage]:
        """Fetch all messages for a conversation ordered by time."""
        result = await self._session.execute(
            select(ChatMessageModel)
            .where(ChatMessageModel.conversation_id == conversation_id)
            .order_by(ChatMessageModel.created_at.asc())
        )
        db_msgs = result.scalars().all()
        return [self._message_to_domain(m) for m in db_msgs]

    async def commit(self) -> None:
        """Commit the active database transaction."""
        await self._session.commit()
