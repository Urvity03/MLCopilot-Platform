"""Declarative base shared by all SQLAlchemy models.

The explicit naming convention makes every constraint and index name
deterministic, so Alembic autogenerate produces stable, reviewable
migrations (docs/architecture/05-postgresql-schema.md).
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Root declarative base; feature models register against this metadata."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
