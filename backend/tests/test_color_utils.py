"""Tests for the pure colour-conversion helpers."""

from __future__ import annotations

from app.services.color_utils import (
    clamp_rgb,
    rgb_to_hex,
    rgb_to_hsl,
    rgb_to_oklch,
)

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREY = (128, 128, 128)


def test_clamp_rgb():
    assert clamp_rgb(300, -10, 127.6) == (255, 0, 128)


def test_rgb_to_hex():
    assert rgb_to_hex(WHITE) == "#FFFFFF"
    assert rgb_to_hex(BLACK) == "#000000"
    assert rgb_to_hex(RED) == "#FF0000"
    assert rgb_to_hex(GREY) == "#808080"


def test_rgb_to_hsl():
    assert rgb_to_hsl(WHITE) == (0, 0, 100)
    assert rgb_to_hsl(BLACK) == (0, 0, 0)
    h, s, lightness = rgb_to_hsl(RED)
    assert h == 0
    assert s == 100
    assert lightness == 50
    gh, gs, gl = rgb_to_hsl(GREY)
    assert gs == 0
    assert gl == 50


def test_oklch_white_black_lightness():
    wl, wc, _ = rgb_to_oklch(WHITE)
    assert abs(wl - 1.0) < 0.01
    assert wc < 0.01

    bl, bc, _ = rgb_to_oklch(BLACK)
    assert abs(bl - 0.0) < 0.01
    assert bc < 0.01


def test_oklch_grey_is_achromatic():
    _, gc, _ = rgb_to_oklch(GREY)
    assert gc < 0.01


def test_oklch_red_has_chroma():
    rl, rc, rh = rgb_to_oklch(RED)
    assert 0.0 < rl < 1.0
    assert rc > 0.1
    assert 0.0 <= rh <= 360.0
