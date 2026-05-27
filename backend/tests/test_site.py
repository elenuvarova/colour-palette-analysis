"""Tests for the website CSS palette feature."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.site_colors import parse_colors


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_parse_colors_hex_rgb_hsl():
    css = """
        body { color: #FF0000; background: #0f0; }
        .a { border-color: rgb(0, 0, 255); }
        .b { color: rgba(0, 0, 255, 0.5); }
        .c { background: hsl(120, 100%, 50%); }
    """
    colors = parse_colors(css)
    assert (255, 0, 0) in colors
    assert (0, 255, 0) in colors  # #0f0 -> #00ff00
    assert colors.count((0, 0, 255)) == 2  # rgb() + rgba()
    assert (0, 255, 0) in colors  # hsl(120,100%,50%) -> green


def test_parse_colors_skips_transparent():
    css = ".x { color: rgba(0,0,0,0); background: #11223300; }"
    assert parse_colors(css) == []


def test_extract_site_blocks_private_host(client):
    resp = client.post("/api/extract-site", json={"url": "http://127.0.0.1/index.html"})
    assert resp.status_code == 400, resp.text
    assert "detail" in resp.json()


def test_extract_site_rejects_non_http(client):
    resp = client.post("/api/extract-site", json={"url": "ftp://example.com"})
    assert resp.status_code == 400, resp.text
    assert "detail" in resp.json()
