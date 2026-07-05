"""Domain error hierarchy.

Raised by entities and services; translated to the HTTP error envelope by
``core.exceptions`` (docs/architecture/11-api-contracts.md). Standard library
only — this module must stay free of framework imports.
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain errors.

    ``code`` is the stable, machine-readable identifier used in the API
    error envelope; ``message`` is safe to show to end users.
    """

    code: str = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    """The requested resource does not exist (or the caller may not see it)."""

    code = "not_found"


class ConflictError(DomainError):
    """The request conflicts with the current state of a resource."""

    code = "conflict"


class IllegalStateTransitionError(DomainError):
    """A lifecycle transition that the domain forbids (e.g. finish before start)."""

    code = "illegal_state_transition"


class UnprocessableError(DomainError):
    """Schema-valid input that is semantically invalid."""

    code = "unprocessable"
