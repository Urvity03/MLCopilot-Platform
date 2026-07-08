"""create_memory_records_and_links

Revision ID: c3b5d2e7f9a1
Revises: a8d6e9f1c7b2
Create Date: 2026-07-08 12:00:00.000000+00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3b5d2e7f9a1"
down_revision: str | None = "a8d6e9f1c7b2"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "memory_records",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "source_event", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "search_tsv",
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('english', content)", persisted=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_memory_records_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_memory_records")),
    )

    op.create_index(
        "memory_records_tsv_idx",
        "memory_records",
        ["search_tsv"],
        unique=False,
        postgresql_using="gin",
    )

    op.create_table(
        "memory_links",
        sa.Column("memory_record_id", sa.UUID(), nullable=False),
        sa.Column("artifact_type", sa.String(length=100), nullable=False),
        sa.Column("artifact_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["memory_record_id"],
            ["memory_records.id"],
            name=op.f("fk_memory_links_memory_record_id_memory_records"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "memory_record_id",
            "artifact_type",
            "artifact_id",
            name=op.f("pk_memory_links"),
        ),
    )
    op.create_index(
        "memory_links_artifact_idx",
        "memory_links",
        ["artifact_type", "artifact_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("memory_links_artifact_idx", table_name="memory_links")
    op.drop_table("memory_links")
    op.drop_index("memory_records_tsv_idx", table_name="memory_records")
    op.drop_table("memory_records")
