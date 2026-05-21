#!/usr/bin/env python3
"""
Phase 22 / A11Y-602 — Tide-Stained palette contrast audit.

WCAG 2.1 AA targets:
- 4.5:1 minimum for normal text (<18pt or <14pt bold)
- 3.0:1 minimum for large text (≥18pt or ≥14pt bold)
- 3.0:1 minimum for UI components (borders, icons)

Computes contrast ratio between every plausible text/background pair in
the closed 12-color Tide-Stained palette. Flags pass/fail per pair.
"""
import json

# Tide-Stained palette (from design_system/colors_and_type.css)
PALETTE = {
    "vellum":       "#E8DFC8",   # primary surface — page
    "salt-bleach":  "#F5EFE0",   # elevated surface — card
    "bone":         "#C8BFA8",   # dividers, disabled
    "tide-ink":     "#1A1F2A",   # primary text
    "drowned-ink":  "#0E1218",   # scene container, deepest bg
    "saltline":     "#4A5A6A",   # borders, secondary text
    "brass":        "#B89968",   # instruments, accents
    "brass-dim":    "#8A724A",   # secondary brass
    "verdigris":    "#4F7A6A",   # success, oxidation
    "lantern":      "#E8B85C",   # visible roll, attention
    "tide-bloom":   "#6B3F8E",   # metaphysical accent
    "drowned-red":  "#8A2E2E",   # lethal stakes
    "phosphor":     "#6FE0C8",   # creator/debug ONLY (never player UI)
}

# Background colors used in the codex
BACKGROUNDS = ["vellum", "salt-bleach", "drowned-ink", "tide-ink"]


def hex_to_rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def relative_luminance(rgb):
    """WCAG 2.1 relative luminance."""
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_ratio(fg_hex, bg_hex):
    l1 = relative_luminance(hex_to_rgb(fg_hex))
    l2 = relative_luminance(hex_to_rgb(bg_hex))
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def band(ratio):
    """WCAG 2.1 band."""
    if ratio >= 7.0:
        return "AAA"
    if ratio >= 4.5:
        return "AA"
    if ratio >= 3.0:
        return "AA-large"
    return "FAIL"


# Build the matrix
results = []
for bg_name in BACKGROUNDS:
    for fg_name, fg_hex in PALETTE.items():
        if fg_name == bg_name:
            continue
        bg_hex = PALETTE[bg_name]
        ratio = contrast_ratio(fg_hex, bg_hex)
        b = band(ratio)
        results.append({
            "fg": fg_name,
            "bg": bg_name,
            "fg_hex": fg_hex,
            "bg_hex": bg_hex,
            "ratio": round(ratio, 2),
            "band": b,
            "use_normal_text": ratio >= 4.5,
            "use_large_text": ratio >= 3.0,
            "use_ui_component": ratio >= 3.0,
        })


# Sort: fails first, then by background, then by ratio descending
results.sort(key=lambda r: (r["band"] != "FAIL", r["bg"], -r["ratio"]))

# Report
print(f"{'fg':14} on {'bg':14}  ratio   band       normal  large   ui")
print("-" * 78)
for r in results:
    n = "✓" if r["use_normal_text"] else "✗"
    l = "✓" if r["use_large_text"] else "✗"
    u = "✓" if r["use_ui_component"] else "✗"
    print(f"{r['fg']:14} on {r['bg']:14}  {r['ratio']:5.2f}  {r['band']:9}  {n:6}  {l:6}  {u}")

# Summary
total = len(results)
fails = sum(1 for r in results if r["band"] == "FAIL")
aa_normal = sum(1 for r in results if r["use_normal_text"])
print(f"\nSummary: {total} pairs tested.")
print(f"  AA normal-text pass: {aa_normal}/{total} ({aa_normal*100//total}%)")
print(f"  AA-large or better: {total-fails}/{total} ({(total-fails)*100//total}%)")
print(f"  FAIL (below 3:1): {fails}/{total}")

# Highlight critical pairs (Phase 20 surfaces use these)
print(f"\nCritical pairs for Phase 20 surfaces:")
critical = [
    ("tide-ink", "vellum", "default body text"),
    ("tide-ink", "salt-bleach", "card body text"),
    ("vellum", "drowned-ink", "scene-container body text"),
    ("saltline", "vellum", "secondary labels"),
    ("brass-dim", "vellum", "tertiary numbering"),
    ("brass", "drowned-ink", "instrument readouts on scene"),
    ("lantern", "drowned-ink", "visible roll on scene"),
    ("verdigris", "vellum", "success state"),
    ("drowned-red", "vellum", "lethal/danger"),
    ("brass-dim", "salt-bleach", "lean-mode badge text on card"),
]
for fg, bg, label in critical:
    r = contrast_ratio(PALETTE[fg], PALETTE[bg])
    b = band(r)
    flag = "" if r >= 4.5 else "  ← BELOW AA"
    print(f"  {label:36} {fg:14} on {bg:14}  {r:5.2f}  {b}{flag}")

# Write JSON for the mirror
output = {
    "palette": PALETTE,
    "backgrounds_tested": BACKGROUNDS,
    "pairs": results,
    "summary": {
        "total_pairs": total,
        "aa_normal_pass": aa_normal,
        "aa_normal_pct": round(aa_normal * 100 / total, 1),
        "below_aa_large": fails,
    },
    "wcag_thresholds": {
        "AA_normal_text": 4.5,
        "AA_large_text_or_ui": 3.0,
        "AAA_normal_text": 7.0,
    },
    "notes": [
        "phosphor color is debug-only — never appears in player UI per design system.",
        "If a Phase 20 surface uses a failing pair, change to a passing pair from the same palette family OR add a brass-dim border for UI components (≥3:1 acceptable).",
        "Bone-on-vellum (#C8BFA8 on #E8DFC8) is intentionally low-contrast — used for dividers/disabled state only, never for active text.",
    ],
}

with open("/sessions/amazing-laughing-bardeen/mnt/outputs/contrast_audit_report.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nOK wrote contrast_audit_report.json ({len(json.dumps(output)):,} bytes)")
