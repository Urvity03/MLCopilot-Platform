"""add oauth and password reset tables

Revision ID: b1c2d3e4f5a6
Revises: 494a1e13596e
Create Date: 2026-08-01 07:00:00.000000+00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b1c2d3e4f5a6'
down_revision: str | None = '494a1e13596e'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # 1. Update users table: password_hash nullable, add avatar_url and last_login
    op.alter_column('users', 'password_hash', nullable=True, existing_type=sa.String(255))
    op.add_column('users', sa.Column('avatar_url', sa.String(512), nullable=True))
    op.add_column('users', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))

    # 2. Create oauth_accounts table
    op.create_table(
        'oauth_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_account_id', sa.String(255), nullable=False),
        sa.Column('provider_email', sa.String(255), nullable=True),
        sa.Column('provider_name', sa.String(255), nullable=True),
        sa.Column('provider_avatar', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('provider', 'provider_account_id', name='uq_oauth_accounts_provider_provider_account_id'),
    )

    # 3. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('password_reset_tokens')
    op.drop_table('oauth_accounts')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'avatar_url')
    op.alter_column('users', 'password_hash', nullable=False, existing_type=sa.String(255))
