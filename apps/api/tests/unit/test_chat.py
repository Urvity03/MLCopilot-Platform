"""Unit and integration tests for the Chat & RAG features."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from mlcopilot.core.config import get_settings
from mlcopilot.core.exceptions import register_exception_handlers
from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.chat import (
    ChatMessage,
    ChatResponse,
    Citation,
    Conversation,
    RetrievedChunk,
)
from mlcopilot.domain.project import Project
from mlcopilot.domain.role import Role
from mlcopilot.domain.user import User
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.chat.deps import (
    get_conversation_repository,
    get_rag_service,
)
from mlcopilot.features.chat.generation import GenerationService
from mlcopilot.features.chat.prompt import PromptBuilder
from mlcopilot.features.chat.retrieval import RetrievalService
from mlcopilot.features.chat.router import router as chat_router
from mlcopilot.features.chat.service import RAGService
from mlcopilot.features.projects.deps import (
    get_membership_repository,
    get_project_repository,
)
from mlcopilot.infrastructure.db.repositories.chat import (
    SqlAlchemyConversationRepository,
)
from mlcopilot.infrastructure.db.repositories.project import (
    SqlAlchemyProjectRepository,
)
from mlcopilot.infrastructure.db.repositories.user import SqlAlchemyUserRepository

# ── Fakes & Mocks ────────────────────────────────────────────────────


class FakeConversationRepository:
    """In-memory implementation of the ConversationRepository protocol."""

    def __init__(self) -> None:
        self.conversations: dict[uuid.UUID, Conversation] = {}
        self.messages: dict[uuid.UUID, list[ChatMessage]] = {}
        self.commits_count = 0

    async def get_by_id(self, conversation_id: uuid.UUID) -> Conversation | None:
        conv = self.conversations.get(conversation_id)
        if conv:
            conv.messages = self.messages.get(conversation_id, [])
        return conv

    async def list_by_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[Conversation]:
        return [
            c
            for c in self.conversations.values()
            if c.project_id == project_id and c.created_by == user_id
        ]

    async def add(self, conversation: Conversation) -> None:
        self.conversations[conversation.id] = conversation
        if conversation.id not in self.messages:
            self.messages[conversation.id] = list(conversation.messages)

    async def delete(self, conversation_id: uuid.UUID) -> None:
        self.conversations.pop(conversation_id, None)
        self.messages.pop(conversation_id, None)

    async def add_message(self, message: ChatMessage) -> None:
        if message.conversation_id not in self.messages:
            self.messages[message.conversation_id] = []
        self.messages[message.conversation_id].append(message)

    async def get_messages(self, conversation_id: uuid.UUID) -> list[ChatMessage]:
        return self.messages.get(conversation_id, [])

    async def commit(self) -> None:
        self.commits_count += 1


class FakeLLMProvider:
    """Mock implementation of the LLMProvider protocol."""

    def __init__(
        self,
        response_text: str = "This is a mock answer.",
        stream_tokens: list[str] | None = None,
    ) -> None:
        self.response_text = response_text
        self.stream_tokens = stream_tokens or ["This", " is", " a", " stream."]

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        return self.response_text

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        for token in self.stream_tokens:
            yield token


class FakeMembershipRepository:
    """Fake repository to override role retrieval in tests."""

    def __init__(self, role: Role | None) -> None:
        self.role = role

    async def role_of(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> Role | None:
        return self.role


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Yield a database session bound to a transaction that rolls back after each test."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.connect() as conn:
        async with conn.begin() as transaction:
            session = session_factory(bind=conn)
            yield session
            await session.close()
            await transaction.rollback()

    await engine.dispose()


# ── Unit Tests ───────────────────────────────────────────────────────


def test_prompt_builder() -> None:
    """Verifies that PromptBuilder correctly formats prompts."""
    system = PromptBuilder.build_system_prompt("Test Project")
    assert "Test Project" in system
    assert "MLCopilot" in system

    chunks = [
        RetrievedChunk(
            chunk_id=uuid.uuid4(),
            upload_id=uuid.uuid4(),
            filename="docs.pdf",
            content="This is context content.",
            position=1,
            score=0.95,
        )
    ]
    history = [
        ChatMessage(
            id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            role="user",
            content="Hello",
            citations=[],
            created_at=datetime.now(UTC),
        )
    ]

    user_prompt = PromptBuilder.build_user_prompt("What is X?", chunks, history)
    assert "docs.pdf" in user_prompt
    assert "This is context content." in user_prompt
    assert "Hello" in user_prompt
    assert "What is X?" in user_prompt


@pytest.mark.asyncio
async def test_retrieval_service() -> None:
    """Verifies that RetrievalService embeds query and formats results."""
    mock_provider = AsyncMock()
    mock_provider.embed.return_value = [0.1, 0.2]

    mock_repo = AsyncMock()
    mock_res = MagicMock()
    mock_res.chunk_id = uuid.uuid4()
    mock_res.upload_id = uuid.uuid4()
    mock_res.score = 0.88
    mock_res.content = "retrieved text"
    mock_res.metadata = {"filename": "test.txt", "position": 3}
    mock_repo.search.return_value = [mock_res]

    service = RetrievalService(mock_provider, mock_repo)
    results = await service.retrieve_relevant_chunks(uuid.uuid4(), "test query")

    assert len(results) == 1
    assert results[0].content == "retrieved text"
    assert results[0].filename == "test.txt"
    assert results[0].position == 3
    assert results[0].score == 0.88
    mock_provider.embed.assert_called_once_with("test query")


@pytest.mark.asyncio
async def test_generation_service() -> None:
    """Verifies that GenerationService invokes LLM correctly."""
    fake_llm = FakeLLMProvider()
    service = GenerationService(fake_llm)

    res = await service.generate_response("sys", "user")
    assert res == "This is a mock answer."

    stream_res = []
    async for tok in service.generate_response_stream("sys", "user"):
        stream_res.append(tok)
    assert "".join(stream_res) == "This is a stream."


@pytest.mark.asyncio
async def test_rag_service_blocking() -> None:
    """Verifies complete blocking orchestrator flow in RAGService."""
    repo = FakeConversationRepository()
    mock_retrieval = AsyncMock()
    mock_retrieval.retrieve_relevant_chunks.return_value = [
        RetrievedChunk(
            chunk_id=uuid.uuid4(),
            upload_id=uuid.uuid4(),
            filename="paper.pdf",
            content="RAG context",
            position=2,
            score=0.91,
        )
    ]
    fake_llm = FakeLLMProvider("AI Response Text")
    generation = GenerationService(fake_llm)

    rag = RAGService(repo, mock_retrieval, generation)

    project_id = uuid.uuid4()
    user_id = uuid.uuid4()
    resp = await rag.chat(project_id, "Project Name", user_id, "User Question")

    assert resp.content == "AI Response Text"
    assert len(resp.citations) == 1
    assert resp.citations[0].filename == "paper.pdf"

    # Verify messages saved
    assert len(repo.conversations) == 1
    conv_id = next(iter(repo.conversations.keys()))
    messages = await repo.get_messages(conv_id)
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"
    assert messages[1].citations[0].filename == "paper.pdf"


@pytest.mark.asyncio
async def test_rag_service_streaming() -> None:
    """Verifies SSE generator output format and persistence in RAGService."""
    repo = FakeConversationRepository()
    mock_retrieval = AsyncMock()
    mock_retrieval.retrieve_relevant_chunks.return_value = []
    fake_llm = FakeLLMProvider(stream_tokens=["Hello", " World"])
    generation = GenerationService(fake_llm)

    rag = RAGService(repo, mock_retrieval, generation)

    project_id = uuid.uuid4()
    user_id = uuid.uuid4()
    generator = rag.chat_stream(
        project_id, "Project Name", user_id, "Question"
    )

    outputs = []
    async for frame in generator:
        outputs.append(frame)

    # 1. Metadata frame, 2. Message frames, 3. Done frame
    assert len(outputs) == 4
    assert outputs[0].startswith("event: metadata")
    assert "event: message" in outputs[1]
    assert "event: message" in outputs[2]
    assert "event: done" in outputs[3]

    # Verify completed message saved to database
    conv_id = next(iter(repo.conversations.keys()))
    messages = await repo.get_messages(conv_id)
    assert len(messages) == 2
    assert messages[1].content == "Hello World"


# ── Repository Integration Tests ─────────────────────────────────────


@pytest.mark.asyncio
async def test_conversation_repository_flow(
    db_session: AsyncSession,
) -> None:
    """Tests SqlAlchemyConversationRepository persistence, title updating, and citation parsing."""
    user_repo = SqlAlchemyUserRepository(db_session)
    project_repo = SqlAlchemyProjectRepository(db_session)
    conv_repo = SqlAlchemyConversationRepository(db_session)

    # Create parent user & project record
    user_id = uuid.uuid4()
    now_utc = datetime.now(UTC)
    user = User(
        id=user_id,
        email="chat_test@example.com",
        password_hash="hash",
        full_name="Chat Tester",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    await user_repo.add(user)

    proj_id = uuid.uuid4()
    project = Project(
        id=proj_id,
        name="Chat Target Project",
        slug="chat-target",
        description="testing RAG",
        created_by=user_id,
        created_at=now_utc,
    )
    await project_repo.add(project)
    await db_session.commit()

    # Define domain Conversation turn
    conv_id = uuid.uuid4()
    conversation = Conversation(
        id=conv_id,
        project_id=proj_id,
        title="RAG Discussion",
        created_by=user_id,
        created_at=now_utc,
    )
    await conv_repo.add(conversation)
    await conv_repo.commit()

    # Append turns
    msg1 = ChatMessage(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="user",
        content="Is pgvector fast?",
        citations=[],
        created_at=now_utc,
    )
    msg2 = ChatMessage(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="assistant",
        content="Yes, using HNSW index.",
        citations=[
            Citation(
                upload_id=uuid.uuid4(),
                filename="pgvector_perf.pdf",
                chunk_id=uuid.uuid4(),
                content="HNSW speeds up queries",
                position=5,
                score=0.94,
            )
        ],
        created_at=now_utc,
    )
    await conv_repo.add_message(msg1)
    await conv_repo.add_message(msg2)
    await conv_repo.commit()

    # Retrieve from DB and assert mapping
    fetched = await conv_repo.get_by_id(conv_id)
    assert fetched is not None
    assert fetched.title == "RAG Discussion"
    assert len(fetched.messages) == 2
    assert fetched.messages[0].role == "user"
    assert fetched.messages[1].role == "assistant"
    assert len(fetched.messages[1].citations) == 1
    assert fetched.messages[1].citations[0].filename == "pgvector_perf.pdf"
    assert fetched.messages[1].citations[0].score == 0.94

    # List by project
    list_res = await conv_repo.list_by_project(proj_id, user_id)
    assert len(list_res) == 1
    assert list_res[0].id == conv_id

    # Delete
    await conv_repo.delete(conv_id)
    await conv_repo.commit()

    deleted = await conv_repo.get_by_id(conv_id)
    assert deleted is None


# ── Route & API Integration Tests ─────────────────────────────────────


@pytest.fixture
def app_with_chat_overrides() -> FastAPI:
    app = FastAPI()
    app.include_router(chat_router)
    register_exception_handlers(app)

    # Mock DB, Project and RAG Service
    fake_project_repo = AsyncMock()
    mock_project = MagicMock()
    mock_project.name = "API Demo Project"
    fake_project_repo.get_by_id.return_value = mock_project

    fake_conv_repo = FakeConversationRepository()
    fake_rag = AsyncMock()

    # Streaming yield mock
    async def mock_chat_stream(*args, **kwargs):
        yield "event: metadata\ndata: {}\n\n"
        yield "event: message\ndata: {\"text\": \"hello\"}\n\n"
        yield "event: done\ndata: {}\n\n"

    fake_rag.chat_stream = mock_chat_stream

    # Blocking mock
    fake_rag.chat.return_value = ChatResponse(
        content="Blocking response",
        citations=[
            Citation(
                upload_id=uuid.uuid4(),
                filename="reference.txt",
                chunk_id=uuid.uuid4(),
                content="reference match",
                position=1,
                score=0.99,
            )
        ],
    )

    app.dependency_overrides[get_project_repository] = (
        lambda: fake_project_repo
    )
    app.dependency_overrides[get_conversation_repository] = (
        lambda: fake_conv_repo
    )
    app.dependency_overrides[get_rag_service] = lambda: fake_rag

    return app


def make_chat_client(app: FastAPI, role: Role | None) -> TestClient:
    user = User(
        id=uuid.uuid4(),
        email="test_api@example.com",
        password_hash="hash",
        full_name="Tester",
        is_active=True,
        is_superuser=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    def override_get_current_user() -> AuthContext:
        return AuthContext(user=user, via="jwt")

    def override_get_membership_repository() -> FakeMembershipRepository:
        return FakeMembershipRepository(role)

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_membership_repository] = (
        override_get_membership_repository
    )

    return TestClient(app)


def test_api_chat_blocking(app_with_chat_overrides: FastAPI) -> None:
    client = make_chat_client(app_with_chat_overrides, Role.MEMBER)
    project_id = str(uuid.uuid4())

    response = client.post(
        f"/projects/{project_id}/chat",
        json={"question": "Can I query pgvector?", "stream": False},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["content"] == "Blocking response"
    assert len(data["citations"]) == 1
    assert data["citations"][0]["filename"] == "reference.txt"


def test_api_chat_streaming(app_with_chat_overrides: FastAPI) -> None:
    client = make_chat_client(app_with_chat_overrides, Role.MEMBER)
    project_id = str(uuid.uuid4())

    response = client.post(
        f"/projects/{project_id}/chat",
        json={"question": "Can I query pgvector?", "stream": True},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    lines = response.text.split("\n\n")
    # Filters out empty strings
    lines = [line for line in lines if line]
    assert len(lines) == 3
    assert "event: metadata" in lines[0]
    assert "event: message" in lines[1]
    assert "event: done" in lines[2]


def test_api_chat_unauthorized_non_member(
    app_with_chat_overrides: FastAPI,
) -> None:
    client = make_chat_client(app_with_chat_overrides, None)
    project_id = str(uuid.uuid4())

    response = client.post(
        f"/projects/{project_id}/chat",
        json={"question": "Can I query pgvector?", "stream": False},
    )

    # Unauthorized non-members must yield 404 to prevent resource leakage
    assert response.status_code == status.HTTP_404_NOT_FOUND
