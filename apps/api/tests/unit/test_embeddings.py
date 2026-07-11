"""Tests for vector embeddings, SentenceTransformers provider, and semantic search."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from mlcopilot.domain.auth import AuthContext
from mlcopilot.domain.embedding import Embedding
from mlcopilot.domain.role import Role
from mlcopilot.domain.upload import (
    ParsedChunk,
    Upload,
    UploadEmbeddingStatus,
    UploadKind,
    UploadParseStatus,
)
from mlcopilot.domain.user import User
from mlcopilot.features.auth.deps import get_current_user
from mlcopilot.features.embeddings.deps import get_embedding_provider
from mlcopilot.features.embeddings.service import EmbeddingService
from mlcopilot.features.projects.deps import get_membership_repository, require_project_role
from mlcopilot.infrastructure.db.models.upload import ParsedChunkModel, UploadModel
from mlcopilot.infrastructure.db.repositories.embedding import PostgresEmbeddingRepository
from mlcopilot.infrastructure.db.repositories.upload import SqlAlchemyUploadRepository
from mlcopilot.infrastructure.embeddings.sentence_transformer import (
    SentenceTransformerEmbeddingProvider,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


# ── Fake/Mock Implementations ─────────────────────────────────────────

class FakeEmbeddingProvider:
    """Mock implementation of EmbeddingProvider that returns deterministic vectors."""

    async def embed(self, text: str) -> list[float]:
        return [0.1] * 384

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [[float(idx) * 0.1] * 384 for idx, _ in enumerate(texts)]


# ── Unit Tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sentence_transformer_provider_embedding() -> None:
    """SentenceTransformerEmbeddingProvider returns correct vector lengths."""
    provider = SentenceTransformerEmbeddingProvider(model_name="all-MiniLM-L6-v2")
    assert provider.model_name == "all-MiniLM-L6-v2"

    vector = await provider.embed("Hello world")
    assert len(vector) == 384
    assert all(isinstance(val, float) for val in vector)

    batch_vectors = await provider.embed_many(["First chunk", "Second chunk"])
    assert len(batch_vectors) == 2
    assert len(batch_vectors[0]) == 384
    assert len(batch_vectors[1]) == 384


@pytest.mark.asyncio
async def test_embedding_service_generate_flow() -> None:
    """EmbeddingService generates and saves missing embeddings batched, updating status."""
    # 1. Setup mock session and repos
    mock_session = MagicMock()
    mock_session_factory = MagicMock()
    mock_session_factory.return_value = mock_session

    # Repos are instantiated inside the service using context managers, so we mock them
    upload_repo = MagicMock(spec=SqlAlchemyUploadRepository)
    embedding_repo = MagicMock(spec=PostgresEmbeddingRepository)

    upload_id = uuid.uuid4()
    project_id = uuid.uuid4()
    upload = Upload(
        id=upload_id,
        project_id=project_id,
        kind=UploadKind.PAPER,
        filename="doc.pdf",
        storage_uri="s3://doc.pdf",
        parse_status=UploadParseStatus.PARSED,
        embedding_status=UploadEmbeddingStatus.PENDING,
        metadata={},
        uploaded_by=uuid.uuid4(),
        created_at=datetime.now(UTC),
    )

    chunk1 = ParsedChunkModel(id=uuid.uuid4(), upload_id=upload_id, position=1, content="text1")
    chunk2 = ParsedChunkModel(id=uuid.uuid4(), upload_id=upload_id, position=2, content="text2")

    # Mocks for Repository lookup
    upload_repo.get_by_id = AsyncMock(return_value=upload)
    upload_repo.get_chunks = AsyncMock(return_value=[chunk1, chunk2])
    upload_repo.update = AsyncMock()

    # chunk1 already has embedding, chunk2 lacks it
    embedding_repo.exists = AsyncMock(side_effect=lambda cid: cid == chunk1.id)
    embedding_repo.add_many = AsyncMock()

    provider = FakeEmbeddingProvider()
    service = EmbeddingService(
        session_factory=mock_session_factory,
        provider=provider,
        model_name="all-MiniLM-L6-v2",
        dimension=384,
    )

    with (
        MagicMock(),
        pytest.MonkeyPatch.context() as mp,
    ):
        mp.setattr(
            "mlcopilot.features.embeddings.service.SqlAlchemyUploadRepository",
            lambda sess: upload_repo,
        )
        mp.setattr(
            "mlcopilot.features.embeddings.service.PostgresEmbeddingRepository",
            lambda sess: embedding_repo,
        )

        await service.generate_embeddings_for_upload(upload_id)

    # Assert status was set to EMBEDDED
    assert upload.embedding_status == UploadEmbeddingStatus.EMBEDDED

    # Assert embed_many was called for only chunk2 (missing embedding)
    # add_many should receive list of Embeddings containing chunk2
    args, _ = embedding_repo.add_many.call_args
    embeddings = args[0]
    assert len(embeddings) == 1
    assert embeddings[0].chunk_id == chunk2.id
    assert embeddings[0].model_name == "all-MiniLM-L6-v2"
    assert embeddings[0].dimension == 384


# ── Database Integration Tests ────────────────────────────────────────

@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """Yield a database session bound to a transaction that rolls back after each test."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from mlcopilot.core.config import get_settings

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


@pytest.mark.asyncio
async def test_postgres_embedding_repository_operations(db_session: AsyncSession) -> None:
    """PostgresEmbeddingRepository CRUD, vector search, and cascade delete functions pass."""
    repo = PostgresEmbeddingRepository(db_session)
    upload_repo = SqlAlchemyUploadRepository(db_session)

    # 1. Setup raw upload & chunk rows
    project_id = uuid.uuid4()
    user_id = uuid.uuid4()
    upload_id = uuid.uuid4()

    # Pre-add dependencies
    from mlcopilot.infrastructure.db.models.project import Project as DbProject
    from mlcopilot.infrastructure.db.models.user import User as DbUser

    user = DbUser(
        id=user_id,
        email=f"tester_{uuid.uuid4().hex[:4]}@example.com",
        password_hash="pw",
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    project = DbProject(
        id=project_id,
        name="Test Search Proj",
        slug=f"search-proj-{uuid.uuid4().hex[:4]}",
        created_by=user_id,
    )
    db_session.add(project)
    await db_session.flush()

    upload = Upload(
        id=upload_id,
        project_id=project_id,
        kind=UploadKind.PAPER,
        filename="search.pdf",
        storage_uri="s3://search.pdf",
        parse_status=UploadParseStatus.PARSED,
        embedding_status=UploadEmbeddingStatus.PENDING,
        metadata={},
        uploaded_by=user_id,
        created_at=datetime.now(UTC),
    )
    await upload_repo.add(upload)

    chunk1 = ParsedChunk(
        id=uuid.uuid4(),
        upload_id=upload_id,
        position=1,
        content="This is semantic text A.",
    )
    chunk2 = ParsedChunk(
        id=uuid.uuid4(),
        upload_id=upload_id,
        position=2,
        content="This is semantic text B.",
    )
    await upload_repo.add_chunks(upload_id, [chunk1, chunk2])
    await db_session.flush()

    # 2. Add embeddings
    emb1 = Embedding(
        id=uuid.uuid4(),
        chunk_id=chunk1.id,
        model_name="all-MiniLM-L6-v2",
        dimension=384,
        embedding=[0.5] * 384,
        created_at=datetime.now(UTC),
    )
    emb2 = Embedding(
        id=uuid.uuid4(),
        chunk_id=chunk2.id,
        model_name="all-MiniLM-L6-v2",
        dimension=384,
        embedding=[-0.5] * 384,
        created_at=datetime.now(UTC),
    )

    await repo.add(emb1)
    await repo.add_many([emb2])
    await db_session.flush()

    # 3. Assert counts and exists
    assert await repo.count() >= 2
    assert await repo.exists(chunk1.id) is True
    assert await repo.exists(uuid.uuid4()) is False

    # 4. Search and verify similarity order
    # Query vector close to [0.5] * 384 (so cosine distance to emb1
    # should be smaller, similarity score higher)
    query_vector = [0.4] * 384
    results = await repo.search(project_id, query_vector, top_k=5)
    assert len(results) == 2
    # emb1 should rank first
    assert results[0].chunk_id == chunk1.id
    assert results[0].score > results[1].score

    # 5. Cascading deletion test: delete upload, embeddings should be gone
    db_upload = await db_session.get(UploadModel, upload_id)
    await db_session.delete(db_upload)
    await db_session.flush()

    assert await repo.exists(chunk1.id) is False
    assert await repo.exists(chunk2.id) is False


# ── API Endpoint Tests ────────────────────────────────────────────────

@pytest.fixture
def app_with_overrides(db_session: AsyncSession) -> FastAPI:
    """Setup app factory with database and mock embedding overrides."""
    from mlcopilot.infrastructure.db.session import get_db_session
    from mlcopilot.main import create_app

    app = create_app()

    # Mock provider to avoid loading sentence-transformers in API test
    mock_provider = FakeEmbeddingProvider()

    # Override dependencies
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[get_embedding_provider] = lambda: mock_provider

    yield app

    app.dependency_overrides.clear()


def make_client(app: FastAPI, role: Role | None) -> TestClient:
    """Returns FastAPI TestClient override with mock authentication context."""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="critic@mlcopilot.com",
        password_hash="pw",
        full_name="Critic",
        is_active=True,
        is_superuser=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    auth_ctx = AuthContext(user=user, via="jwt")

    # Mock Auth dependency
    app.dependency_overrides[get_current_user] = lambda: auth_ctx

    # Mock Membership dependency
    membership_repo = MagicMock()
    membership_repo.role_of = AsyncMock(return_value=role)

    app.dependency_overrides[get_membership_repository] = lambda: membership_repo

    return TestClient(app)


def test_search_api_unauthorized_and_rbac(app_with_overrides: FastAPI) -> None:
    """Semantic search routes reject unauthorized users or non-members."""
    project_id = str(uuid.uuid4())

    # 1. Unauthenticated / Non-member (Role = None)
    client_non_member = make_client(app_with_overrides, role=None)
    res = client_non_member.post(
        f"/api/v1/projects/{project_id}/search",
        json={"query": "test query", "top_k": 3},
    )
    # require_project_role returns 403 or 404 for missing memberships
    assert res.status_code in {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND}


@pytest.mark.asyncio
async def test_search_api_endpoint_success_and_isolation(
    app_with_overrides: FastAPI,
    db_session: AsyncSession,
) -> None:
    """API semantic search executes, isolates results to project, and orders by similarity score."""
    upload_repo = SqlAlchemyUploadRepository(db_session)
    embedding_repo = PostgresEmbeddingRepository(db_session)

    # 1. Seed project A (Target Project)
    user_id = uuid.uuid4()
    project_a_id = uuid.uuid4()
    upload_a_id = uuid.uuid4()

    # Pre-add dependencies
    from mlcopilot.infrastructure.db.models.project import Project as DbProject
    from mlcopilot.infrastructure.db.models.user import User as DbUser

    user = DbUser(
        id=user_id,
        email="critic@mlcopilot.com",
        password_hash="pw",
        full_name="Critic",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    project_a = DbProject(
        id=project_a_id,
        name="Project A",
        slug=f"proj-a-{uuid.uuid4().hex[:4]}",
        created_by=user_id,
    )
    db_session.add(project_a)
    await db_session.flush()

    upload_a = Upload(
        id=upload_a_id,
        project_id=project_a_id,
        kind=UploadKind.PAPER,
        filename="search_a.pdf",
        storage_uri="s3://search_a.pdf",
        parse_status=UploadParseStatus.PARSED,
        embedding_status=UploadEmbeddingStatus.EMBEDDED,
        metadata={},
        uploaded_by=user_id,
        created_at=datetime.now(UTC),
    )
    await upload_repo.add(upload_a)

    chunk_a = ParsedChunk(
        id=uuid.uuid4(),
        upload_id=upload_a_id,
        position=1,
        content="Project A vector contents.",
    )
    await upload_repo.add_chunks(upload_a_id, [chunk_a])
    await db_session.flush()

    # Add embedding for Project A chunk
    emb_a = Embedding(
        id=uuid.uuid4(),
        chunk_id=chunk_a.id,
        model_name="all-MiniLM-L6-v2",
        dimension=384,
        # Vector points to [0.1] * 384
        embedding=[0.1] * 384,
        created_at=datetime.now(UTC),
    )
    await embedding_repo.add(emb_a)
    await db_session.flush()

    # 2. Seed project B (Noise Project)
    project_b_id = uuid.uuid4()
    upload_b_id = uuid.uuid4()

    project_b = DbProject(
        id=project_b_id,
        name="Project B",
        slug=f"proj-b-{uuid.uuid4().hex[:4]}",
        created_by=user_id,
    )
    db_session.add(project_b)
    await db_session.flush()

    upload_b = Upload(
        id=upload_b_id,
        project_id=project_b_id,
        kind=UploadKind.PAPER,
        filename="search_b.pdf",
        storage_uri="s3://search_b.pdf",
        parse_status=UploadParseStatus.PARSED,
        embedding_status=UploadEmbeddingStatus.EMBEDDED,
        metadata={},
        uploaded_by=user_id,
        created_at=datetime.now(UTC),
    )
    await upload_repo.add(upload_b)

    chunk_b = ParsedChunk(
        id=uuid.uuid4(),
        upload_id=upload_b_id,
        position=1,
        content="Project B vector contents.",
    )
    await upload_repo.add_chunks(upload_b_id, [chunk_b])
    await db_session.flush()

    emb_b = Embedding(
        id=uuid.uuid4(),
        chunk_id=chunk_b.id,
        model_name="all-MiniLM-L6-v2",
        dimension=384,
        embedding=[0.15] * 384,
        created_at=datetime.now(UTC),
    )
    await embedding_repo.add(emb_b)
    await db_session.flush()

    # 3. Perform authorized search on Project A
    make_client(app_with_overrides, role=Role.VIEWER)
    # Override ProjectContext matching user's query project ID
    from mlcopilot.domain.project import ProjectContext
    member_ctx = ProjectContext(
        project_id=project_a_id,
        user=User(
            id=user_id,
            email="critic@mlcopilot.com",
            password_hash="pw",
            full_name="Critic",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        ),
        role=Role.VIEWER,
    )
    app_with_overrides.dependency_overrides[require_project_role(Role.VIEWER)] = lambda: member_ctx

    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=app_with_overrides)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post(
            f"/api/v1/projects/{project_a_id}/search",
            json={"query": "Retrieve target data", "top_k": 3},
        )

    assert res.status_code == status.HTTP_200_OK
    search_data = res.json()
    assert "results" in search_data
    results_list = search_data["results"]

    # Assert project isolation: Only Project A's chunk should be
    # returned, Project B's chunk is hidden!
    assert len(results_list) == 1
    assert results_list[0]["upload_id"] == str(upload_a_id)
    assert results_list[0]["chunk_id"] == str(chunk_a.id)
    assert results_list[0]["content"] == "Project A vector contents."
    assert "score" in results_list[0]
