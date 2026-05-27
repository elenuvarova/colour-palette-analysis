"""API-level tests using FastAPI's TestClient."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def _assert_valid_schema(payload: dict) -> None:
    assert "colors" in payload and "meta" in payload
    meta = payload["meta"]
    assert set(meta) >= {
        "total_pixels",
        "processed_pixels",
        "image_size",
        "processing_ms",
        "mode",
    }
    assert isinstance(meta["image_size"], list) and len(meta["image_size"]) == 2
    for c in payload["colors"]:
        assert c["hex"].startswith("#") and len(c["hex"]) == 7
        assert len(c["rgb"]) == 3
        assert len(c["hsl"]) == 3
        assert len(c["oklch"]) == 3
        assert isinstance(c["percentage"], (int, float))
        assert isinstance(c["pixel_count"], int)


def test_extract_solid_red_fast(client, solid_red_bytes):
    resp = client.post(
        "/api/extract",
        files={"file": ("red.png", solid_red_bytes, "image/png")},
        data={"limit": "8", "tolerance": "32", "mode": "fast"},
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_valid_schema(payload)
    assert payload["colors"][0]["hex"] == "#FF0000"
    assert abs(payload["colors"][0]["percentage"] - 100.0) < 0.01
    assert payload["meta"]["image_size"] == [100, 100]
    assert payload["meta"]["total_pixels"] == 10000


def test_extract_precision_mode(client, blocks_bytes):
    resp = client.post(
        "/api/extract",
        files={"file": ("blocks.png", blocks_bytes, "image/png")},
        data={"limit": "4", "mode": "precision"},
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_valid_schema(payload)
    assert payload["meta"]["mode"] == "precision"
    assert len(payload["colors"]) >= 2


def test_extract_rejects_non_image(client):
    resp = client.post(
        "/api/extract",
        files={"file": ("notes.txt", b"this is not an image", "text/plain")},
        data={"mode": "fast"},
    )
    assert resp.status_code >= 400
    assert "detail" in resp.json()


def test_extract_rejects_oversized_payload(client):
    big = b"\x00" * (10 * 1024 * 1024 + 1)
    resp = client.post(
        "/api/extract",
        files={"file": ("big.png", big, "image/png")},
        data={"mode": "fast"},
    )
    assert resp.status_code >= 400
    assert "detail" in resp.json()


def test_extract_invalid_tolerance(client, solid_red_bytes):
    resp = client.post(
        "/api/extract",
        files={"file": ("red.png", solid_red_bytes, "image/png")},
        data={"tolerance": "500", "mode": "fast"},
    )
    assert resp.status_code in (400, 422)
    assert "detail" in resp.json()


def test_extract_clamps_limit(client, blocks_bytes):
    resp = client.post(
        "/api/extract",
        files={"file": ("blocks.png", blocks_bytes, "image/png")},
        data={"limit": "99", "mode": "fast"},
    )
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["colors"]) <= 16


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/x.png",
        "http://localhost/x.png",
        "http://169.254.169.254/latest/meta-data/",  # cloud metadata endpoint
        "http://10.0.0.1/x.png",
        "http://192.168.1.1/x.png",
    ],
)
def test_extract_url_blocks_private_hosts(client, url):
    resp = client.post("/api/extract-url", json={"url": url})
    assert resp.status_code == 400, resp.text
    assert "detail" in resp.json()


def test_extract_url_unresolvable_host(client):
    resp = client.post("/api/extract-url", json={"url": "http://no-such-host.invalid/x.png"})
    assert resp.status_code == 400, resp.text
    assert "resolve" in resp.json()["detail"].lower()


def test_extract_rejects_oversized_by_content_length(client):
    # Larger than max_file_size + 1 MB headroom -> rejected early by middleware.
    big = b"\x00" * (12 * 1024 * 1024)
    resp = client.post(
        "/api/extract",
        files={"file": ("huge.png", big, "image/png")},
    )
    assert resp.status_code == 413, resp.text
    assert "detail" in resp.json()
