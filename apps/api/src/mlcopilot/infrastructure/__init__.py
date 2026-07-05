"""Infrastructure layer: database, cache, and (later) graph/storage clients.

Implements protocols defined by the application layer; may import domain/
but never features/ (enforced by import-linter).
"""
