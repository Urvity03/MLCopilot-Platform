from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from mlcopilot.core.config import get_settings
from mlcopilot.domain.api_key import ApiKey
from mlcopilot.domain.errors import NotFoundError
from mlcopilot.domain.refresh_token import RefreshToken
from mlcopilot.domain.user import User
from mlcopilot.infrastructure.db.repositories.api_key import SqlAlchemyApiKeyRepository
from mlcopilot.infrastructure.db.repositories.refresh_token import (
    SqlAlchemyRefreshTokenRepository,
)
from mlcopilot.infrastructure.db.repositories.user import SqlAlchemyUserRepository

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from sqlalchemy.ext.asyncio import AsyncSession


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


async def test_user_repository_flow(db_session: AsyncSession) -> None:
    """Test standard CRUD operations for UserRepository."""
    repo = SqlAlchemyUserRepository(db_session)
    user_id = uuid.uuid4()
    now_utc = datetime.now(UTC)

    user = User(
        id=user_id,
        email="TestUser@example.com",
        password_hash="hashed_password_123",
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )

    # 1. Add User
    await repo.add(user)

    # 2. Get by ID
    retrieved = await repo.get_by_id(user_id)
    assert retrieved is not None
    assert retrieved.id == user_id
    assert retrieved.email == "TestUser@example.com"
    assert retrieved.full_name == "Test User"
    assert retrieved.is_active is True

    # 3. Get by Case-Insensitive Email (CITEXT verification)
    retrieved_by_email = await repo.get_by_email("testuser@example.com")
    assert retrieved_by_email is not None
    assert retrieved_by_email.id == user_id

    # 4. Update User
    updated_user = User(
        id=user_id,
        email="TestUser@example.com",
        password_hash="new_hash",
        full_name="Updated User",
        is_active=False,
        is_superuser=True,
        created_at=user.created_at,
        updated_at=datetime.now(UTC),
    )
    await repo.update(updated_user)

    retrieved_updated = await repo.get_by_id(user_id)
    assert retrieved_updated is not None
    assert retrieved_updated.full_name == "Updated User"
    assert retrieved_updated.password_hash == "new_hash"  # noqa: S105
    assert retrieved_updated.is_active is False
    assert retrieved_updated.is_superuser is True

    # 5. Non-existent update raises NotFoundError
    fake_user = User(
        id=uuid.uuid4(),
        email="fake@example.com",
        password_hash="...",
        full_name="...",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    with pytest.raises(NotFoundError):
        await repo.update(fake_user)


async def test_refresh_token_repository_flow(db_session: AsyncSession) -> None:
    """Test session rotation and family revocation operations for RefreshTokenRepository."""
    user_repo = SqlAlchemyUserRepository(db_session)
    token_repo = SqlAlchemyRefreshTokenRepository(db_session)

    user_id = uuid.uuid4()
    now_utc = datetime.now(UTC)
    user = User(
        id=user_id,
        email="session_user@example.com",
        password_hash="hashed_pw",
        full_name="Session User",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    await user_repo.add(user)

    family_id = uuid.uuid4()
    token_id = uuid.uuid4()
    token_hash = "token_hash_abc_123"  # noqa: S105

    token = RefreshToken(
        id=token_id,
        user_id=user_id,
        family_id=family_id,
        token_hash=token_hash,
        expires_at=now_utc + timedelta(days=14),
        revoked_at=None,
        created_at=now_utc,
        updated_at=now_utc,
    )

    # 1. Add Refresh Token
    await token_repo.add(token)

    # 2. Get by ID and Hash
    retrieved = await token_repo.get_by_id(token_id)
    assert retrieved is not None
    assert retrieved.token_hash == token_hash

    retrieved_by_hash = await token_repo.get_by_hash(token_hash)
    assert retrieved_by_hash is not None
    assert retrieved_by_hash.id == token_id

    # 3. List Active by Family
    active_tokens = await token_repo.list_active_by_family(family_id)
    assert len(active_tokens) == 1
    assert active_tokens[0].id == token_id

    # 4. Rotate Token (Add new, update old to revoked)
    new_token_id = uuid.uuid4()
    new_token_hash = "rotated_hash_xyz"  # noqa: S105
    new_token = RefreshToken(
        id=new_token_id,
        user_id=user_id,
        family_id=family_id,
        token_hash=new_token_hash,
        expires_at=now_utc + timedelta(days=14),
        revoked_at=None,
        created_at=now_utc,
        updated_at=now_utc,
    )
    await token_repo.add(new_token)

    # Revoke old
    token.revoked_at = now_utc
    await token_repo.update(token)

    active_tokens_after_rotation = await token_repo.list_active_by_family(family_id)
    assert len(active_tokens_after_rotation) == 1
    assert active_tokens_after_rotation[0].id == new_token_id

    # 5. Revoke Family
    await token_repo.revoke_family(family_id)

    active_tokens_after_revocation = await token_repo.list_active_by_family(family_id)
    assert len(active_tokens_after_revocation) == 0


async def test_api_key_repository_flow(db_session: AsyncSession) -> None:
    """Test programmatic API key management for ApiKeyRepository."""
    user_repo = SqlAlchemyUserRepository(db_session)
    key_repo = SqlAlchemyApiKeyRepository(db_session)

    user_id = uuid.uuid4()
    now_utc = datetime.now(UTC)
    user = User(
        id=user_id,
        email="apikey_user@example.com",
        password_hash="hashed_pw",
        full_name="ApiKey User",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    await user_repo.add(user)

    key_id = uuid.uuid4()
    key_hash = "sha256_hash_of_secret"

    key = ApiKey(
        id=key_id,
        user_id=user_id,
        name="Developer Key",
        prefix="mlc_1234",
        key_hash=key_hash,
        scopes=["read", "write"],
        revoked_at=None,
        last_used_at=None,
        created_at=now_utc,
        updated_at=now_utc,
    )

    # 1. Add ApiKey
    await key_repo.add(key)

    # 2. Get by ID and Hash
    retrieved = await key_repo.get_by_id(key_id)
    assert retrieved is not None
    assert retrieved.name == "Developer Key"
    assert retrieved.scopes == ["read", "write"]

    retrieved_by_hash = await key_repo.get_by_hash(key_hash)
    assert retrieved_by_hash is not None
    assert retrieved_by_hash.id == key_id

    # 3. List Active for User
    active_keys = await key_repo.list_active_for_user(user_id)
    assert len(active_keys) == 1
    assert active_keys[0].id == key_id

    # 4. Update usage and revoke key
    key.last_used_at = now_utc
    key.revoked_at = now_utc
    await key_repo.update(key)

    retrieved_updated = await key_repo.get_by_id(key_id)
    assert retrieved_updated is not None
    assert retrieved_updated.last_used_at is not None
    assert retrieved_updated.revoked_at is not None

    # 5. Check no active keys remaining for user
    active_keys_after_revocation = await key_repo.list_active_for_user(user_id)
    assert len(active_keys_after_revocation) == 0


async def test_repository_uniqueness_constraints(db_session: AsyncSession) -> None:
    """Test that violating database unique constraints raises IntegrityError."""
    user_repo = SqlAlchemyUserRepository(db_session)
    token_repo = SqlAlchemyRefreshTokenRepository(db_session)

    user_id_1 = uuid.uuid4()
    user_id_2 = uuid.uuid4()
    now_utc = datetime.now(UTC)

    # 1. Duplicate email constraint
    user_1 = User(
        id=user_id_1,
        email="Duplicate@example.com",
        password_hash="pw1",
        full_name="User One",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    user_2 = User(
        id=user_id_2,
        email="duplicate@example.com",  # Duplicate email (case-insensitive because CITEXT)
        password_hash="pw2",
        full_name="User Two",
        is_active=True,
        is_superuser=False,
        created_at=now_utc,
        updated_at=now_utc,
    )

    async with db_session.begin_nested():
        await user_repo.add(user_1)

    try:
        async with db_session.begin_nested():
            await user_repo.add(user_2)
            pytest.fail("Expected IntegrityError for duplicate email, but it succeeded")
    except IntegrityError:
        pass  # Success, savepoint rolled back automatically

    # 2. Duplicate refresh token hash constraint
    family_id_1 = uuid.uuid4()
    family_id_2 = uuid.uuid4()
    token_id_1 = uuid.uuid4()
    token_id_2 = uuid.uuid4()
    token_hash = "shared_token_hash_value"  # noqa: S105

    token_1 = RefreshToken(
        id=token_id_1,
        user_id=user_id_1,
        family_id=family_id_1,
        token_hash=token_hash,
        expires_at=now_utc + timedelta(days=14),
        revoked_at=None,
        created_at=now_utc,
        updated_at=now_utc,
    )
    token_2 = RefreshToken(
        id=token_id_2,
        user_id=user_id_1,
        family_id=family_id_2,
        token_hash=token_hash,
        expires_at=now_utc + timedelta(days=14),
        revoked_at=None,
        created_at=now_utc,
        updated_at=now_utc,
    )

    async with db_session.begin_nested():
        await token_repo.add(token_1)

    try:
        async with db_session.begin_nested():
            await token_repo.add(token_2)
            pytest.fail("Expected IntegrityError for duplicate token_hash, but it succeeded")
    except IntegrityError:
        pass  # Success, savepoint rolled back automatically


