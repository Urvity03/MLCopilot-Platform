"""enable_pgvector_and_create_embeddings

Revision ID: 30a5f0243126
Revises: e9d7d47ebee4
Create Date: 2026-07-10 05:24:28.959021+00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


from pgvector.sqlalchemy import Vector

revision: str = '30a5f0243126'
down_revision: str | None = 'e9d7d47ebee4'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Add embedding_status column and check constraint to uploads table
    op.add_column(
        'uploads',
        sa.Column('embedding_status', sa.Text(), server_default='pending', nullable=False)
    )
    op.create_check_constraint(
        'uploads_embedding_status_check',
        'uploads',
        "embedding_status IN ('pending', 'embedding', 'embedded', 'failed')"
    )

    # 3. Create chunk_embeddings table
    op.create_table(
        'chunk_embeddings',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('chunk_id', sa.Uuid(), nullable=False),
        sa.Column('model_name', sa.Text(), nullable=False),
        sa.Column('dimension', sa.Integer(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['chunk_id'], ['parsed_chunks.id'], name=op.f('fk_chunk_embeddings_chunk_id_parsed_chunks'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_chunk_embeddings')),
        sa.UniqueConstraint('chunk_id', name=op.f('uq_chunk_embeddings_chunk_id'))
    )

    # 4. Create HNSW index for cosine similarity search
    op.execute(
        "CREATE INDEX idx_chunk_embeddings_vector ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);"
    )


def downgrade() -> None:
    # 1. Drop HNSW index
    op.execute("DROP INDEX IF EXISTS idx_chunk_embeddings_vector;")

    # 2. Drop chunk_embeddings table
    op.drop_table('chunk_embeddings')

    # 3. Drop constraint and column from uploads table
    op.drop_constraint('uploads_embedding_status_check', 'uploads', type_='check')
    op.drop_column('uploads', 'embedding_status')

