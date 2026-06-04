"""Tests for the broadened CSS colour parser (modern syntaxes, named, var())."""

from __future__ import annotations

from collections import Counter

from app.services.site_colors import parse_colors


def test_oklch_parsed():
    colors = parse_colors(".a { color: oklch(0.628 0.2577 29.23); }")
    # oklch red maps very close to sRGB red.
    assert any(abs(r - 255) <= 2 and g <= 5 and b <= 5 for (r, g, b) in colors)


def test_oklab_parsed():
    colors = parse_colors(".a { color: oklab(0.628 0.225 0.126); }")
    assert colors, "expected at least one colour from oklab()"
    r, g, b = colors[0]
    assert r > 200 and g < 80 and b < 80


def test_lab_parsed():
    colors = parse_colors(".a { color: lab(54.29 80.81 69.89); }")
    assert colors
    r, g, b = colors[0]
    assert r > 240 and g < 30 and b < 30


def test_lch_parsed():
    colors = parse_colors(".a { color: lch(54.29 106.84 40.86); }")
    assert colors
    r, g, b = colors[0]
    assert r > 240 and g < 30 and b < 30


def test_hwb_parsed():
    # hwb(0 0% 0%) is pure red.
    assert (255, 0, 0) in parse_colors(".a { color: hwb(0 0% 0%); }")
    # hwb(0 50% 0%) mixes 50% white into red -> (255,128,128).
    assert (255, 128, 128) in parse_colors(".b { color: hwb(0 50% 0%); }")


def test_named_colours_parsed():
    css = ".a { color: rebeccapurple; } .b { background: cornflowerblue; } .c { color: tomato; }"
    colors = parse_colors(css)
    assert (102, 51, 153) in colors  # rebeccapurple
    assert (100, 149, 237) in colors  # cornflowerblue
    assert (255, 99, 71) in colors  # tomato


def test_named_transparent_skipped():
    assert parse_colors(".a { background: transparent; }") == []


def test_named_colour_not_matched_inside_identifier():
    """A colour name embedded in a class/identifier must not be tallied."""
    # 'red' inside '.text-red', 'tan' inside 'tangerine', 'navy' inside '.navybar'.
    css = ".text-red { padding: 0; } .navybar { x: tangerine-ish; }"
    assert parse_colors(css) == []


def test_var_resolution_counts_referenced_colour():
    css = """
        :root { --brand: #7B6FFE; }
        .header { color: var(--brand); }
        .footer { border-color: var(--brand); }
    """
    colors = parse_colors(css)
    counts = Counter(colors)
    # Declaration (1) + two usages (2) = three tallies of the brand violet.
    assert counts[(123, 111, 254)] == 3


def test_var_resolution_with_functional_value():
    css = ":root { --bg: oklch(0.13 0.01 280); } body { background: var(--bg); }"
    colors = parse_colors(css)
    # Both the declaration and the usage resolve to the same near-black violet.
    assert len(colors) == 2
    assert colors[0] == colors[1]


def test_var_transitive_resolution():
    css = ":root { --a: #FF0000; --b: var(--a); } .x { color: var(--b); }"
    colors = parse_colors(css)
    assert (255, 0, 0) in colors


def test_var_unknown_left_untouched():
    # An undeclared var() resolves to nothing and is simply not counted.
    assert parse_colors(".x { color: var(--missing); }") == []


def test_mixed_modern_stylesheet():
    css = """
        :root { --accent: #7B6FFE; --ink: oklch(0.13 0.01 280); }
        body { background: var(--ink); color: white; }
        a { color: var(--accent); }
        .btn { background: hsl(252 99% 71%); border: 1px solid rgb(123, 111, 254); }
        .warn { color: lab(54.29 80.81 69.89); }
    """
    colors = parse_colors(css)
    assert len(colors) >= 6
    assert (255, 255, 255) in colors  # white (named)
    assert (123, 111, 254) in colors  # accent via var + rgb()
