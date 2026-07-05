"""Error envelope and request-ID middleware behavior."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from httpx import AsyncClient


async def test_unknown_route_returns_envelope(client: AsyncClient) -> None:
    response = await client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"]
    assert body["error"]["details"] == []
    assert body["error"]["request_id"] == response.headers["x-request-id"]


async def test_generated_request_id_has_expected_shape(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.headers["x-request-id"].startswith("req_")


async def test_supplied_request_id_is_honored(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/health/live", headers={"X-Request-ID": "req_client_supplied"}
    )
    assert response.headers["x-request-id"] == "req_client_supplied"


async def test_security_headers_present(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
