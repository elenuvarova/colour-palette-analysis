"""Security tests: decompression-bomb rejection, SSRF/DNS-rebinding, error hygiene."""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.exceptions import AppError
from app.main import app
from app.services import image_loader, site_colors


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _png(width: int, height: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


# --- Decompression bomb -------------------------------------------------------


def test_decompression_bomb_rejected_as_413(monkeypatch):
    """A pixel-flood image is a handled 4xx, never an uncaught 500/traceback."""
    # Lower Pillow's guard so a modest image trips the bomb check, mirroring how
    # the guard fires for a real multi-billion-pixel decode in production.
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 100)
    data = _png(200, 200)  # 40,000 px >> 2 * 100 -> DecompressionBombError

    with pytest.raises(AppError) as excinfo:
        image_loader._open_and_normalise(data, ignore_alpha=True)
    assert excinfo.value.status_code == 413
    assert "too large" in excinfo.value.message.lower()


def test_decompression_bomb_warning_rejected(monkeypatch):
    """A size that only trips the warning (1x..2x) is still rejected, not decoded."""
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 30_000)
    data = _png(200, 200)  # 40,000 px -> between 1x and 2x -> DecompressionBombWarning

    with pytest.raises(AppError) as excinfo:
        image_loader._open_and_normalise(data, ignore_alpha=True)
    assert excinfo.value.status_code == 413


def test_decompression_bomb_via_upload_endpoint(client, monkeypatch):
    """End to end: the /api/extract route returns a clean 4xx, not a 500."""
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 100)
    data = _png(200, 200)
    resp = client.post(
        "/api/extract",
        files={"file": ("bomb.png", data, "image/png")},
        data={"mode": "fast"},
    )
    assert resp.status_code == 413, resp.text
    assert "detail" in resp.json()


def test_pillow_max_image_pixels_guard_active():
    """The MAX_IMAGE_PIXELS guard must be in effect (Pillow defaults it on)."""
    assert Image.MAX_IMAGE_PIXELS is not None
    assert Image.MAX_IMAGE_PIXELS > 0


# --- Generic error handler ----------------------------------------------------


def test_unhandled_exception_returns_clean_500():
    """Any unexpected error becomes a 500 with a generic message and no traceback."""
    test_app = app

    @test_app.get("/_boom_test")
    def _boom():  # pragma: no cover - exercised via the client below
        raise RuntimeError("super secret internal detail")

    local_client = TestClient(test_app, raise_server_exceptions=False)
    resp = local_client.get("/_boom_test")
    assert resp.status_code == 500
    body = resp.json()
    assert body == {"detail": "Something went wrong on our end. Please try again."}
    assert "secret" not in resp.text
    assert "Traceback" not in resp.text


# --- SSRF / DNS-rebinding -----------------------------------------------------


def _fake_getaddrinfo(ip: str):
    """Build a socket.getaddrinfo replacement that resolves any host to ``ip``."""
    import socket

    def _resolver(host, port, *args, **kwargs):
        family = socket.AF_INET6 if ":" in ip else socket.AF_INET
        sockaddr = (ip, port or 0, 0, 0) if family == socket.AF_INET6 else (ip, port or 0)
        return [(family, socket.SOCK_STREAM, 6, "", sockaddr)]

    return _resolver


@pytest.mark.parametrize(
    "ip",
    [
        "127.0.0.1",
        "169.254.169.254",  # cloud metadata
        "10.0.0.1",
        "192.168.1.1",
        "172.16.5.5",
        "0.0.0.0",
        "::1",
        "::ffff:127.0.0.1",  # IPv4-mapped IPv6 loopback
        "::ffff:169.254.169.254",
    ],
)
def test_resolve_allowed_ips_blocks_internal(monkeypatch, ip):
    """A host resolving to any non-public address is refused before connecting."""
    import socket

    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo(ip))
    with pytest.raises(AppError) as excinfo:
        image_loader._resolve_allowed_ips("evil.example.com")
    assert excinfo.value.status_code == 400


def test_resolve_allowed_ips_allows_public(monkeypatch):
    """A public address resolves to the literal IP the connection will be pinned to."""
    import socket

    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("93.184.216.34"))
    ips = image_loader._resolve_allowed_ips("example.com")
    assert ips == ["93.184.216.34"]


def test_extract_url_blocks_rebind_to_loopback(client, monkeypatch):
    """A host that resolves to loopback is blocked even with a public-looking name."""
    import socket

    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("127.0.0.1"))
    resp = client.post("/api/extract-url", json={"url": "http://totally-public.example/x.png"})
    assert resp.status_code == 400, resp.text
    assert "detail" in resp.json()


def test_extract_site_blocks_rebind_to_metadata(client, monkeypatch):
    """The site path applies the same resolve-and-pin guard as the image path."""
    import socket

    monkeypatch.setattr(socket, "getaddrinfo", _fake_getaddrinfo("169.254.169.254"))
    resp = client.post("/api/extract-site", json={"url": "http://looks-fine.example/"})
    assert resp.status_code == 400, resp.text
    assert "detail" in resp.json()


def test_pinned_client_connects_only_to_vetted_ip(monkeypatch):
    """The pinned transport substitutes the vetted IP for the host on connect.

    Spy on the underlying httpcore backend so we observe the host that the
    pinning backend actually forwards to the socket layer.
    """
    import httpcore

    captured: dict[str, str] = {}

    def _spy_connect_tcp(self, host, port, *args, **kwargs):
        captured["host"] = host
        # Stop before a real socket is opened; we only need the target host.
        raise RuntimeError("stop after connect target observed")

    monkeypatch.setattr(httpcore.SyncBackend, "connect_tcp", _spy_connect_tcp)
    pinned = image_loader._pinned_client("evil.example.com", ["93.184.216.34"])
    try:
        with pytest.raises(RuntimeError):
            pinned.get("http://evil.example.com/")
    finally:
        pinned.close()
    assert captured.get("host") == "93.184.216.34"


def test_site_redirect_second_hop_to_loopback_blocked(client, monkeypatch):
    """A redirect whose 2nd hop resolves to loopback is blocked before the body read."""
    import socket

    import httpx

    # First hop resolves public, redirects to an internal host; the 2nd-hop
    # resolution returns loopback and must be refused.
    state = {"calls": 0}

    def _resolver(host, port, *args, **kwargs):
        state["calls"] += 1
        ip = "93.184.216.34" if host == "public.example" else "127.0.0.1"
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port or 0))]

    monkeypatch.setattr(socket, "getaddrinfo", _resolver)

    def _handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "public.example":
            return httpx.Response(302, headers={"location": "http://internal.example/"})
        return httpx.Response(200, text="<html></html>")

    transport = httpx.MockTransport(_handler)

    # Patch _pinned_get_url so the redirect logic runs against the mock transport
    # while still enforcing the resolve-and-vet guard for each hop.
    def _fake_pinned_get_url(url: str):
        host = httpx.URL(url).host
        image_loader._assert_host_allowed(host)
        c = httpx.Client(transport=transport, follow_redirects=False)
        return c, c.stream("GET", url)

    monkeypatch.setattr(site_colors, "_pinned_get_url", _fake_pinned_get_url)

    with pytest.raises(AppError) as excinfo:
        site_colors._fetch_following_redirects("http://public.example/")
    assert excinfo.value.status_code == 400
