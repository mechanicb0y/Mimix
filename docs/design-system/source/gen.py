"""Mimix design tokens: single source of truth.
Generates tokens.css, tailwind-theme.css, CONTRAST.md and contrast.json.
Usage: python3 -I gen.py <outdir>
"""
import json, sys, os

PHOTO = [  # Holst palette, extracted from the theme photo (darkest to lightest)
    ("Abyss", "#04222B"), ("Deep", "#0A3D4A"), ("Harbor", "#10606F"),
    ("Lagoon", "#1D8B94"), ("Tide", "#4FB8B4"), ("Seafoam", "#98D8D0"), ("Mist", "#E2F4F0"),
]

# BEFORE: the naive mapping straight from the photo, used for the before/after sheet.
BEFORE = {
    "dark": {
        "bg": "#04222B", "surface": "#0A3D4A", "surface-2": "#10606F",
        "border-strong": "#1D8B94", "text": "#E2F4F0", "text-muted": "#98D8D0",
        "text-subtle": "#4FB8B4", "primary": "#1D8B94", "on-primary": "#FFFFFF",
        "primary-text": "#4FB8B4", "focus": "#4FB8B4",
    },
    "light": {
        "bg": "#E2F4F0", "surface": "#FFFFFF", "surface-2": "#98D8D0",
        "border-strong": "#4FB8B4", "text": "#04222B", "text-muted": "#10606F",
        "text-subtle": "#1D8B94", "primary": "#1D8B94", "on-primary": "#FFFFFF",
        "primary-text": "#1D8B94", "focus": "#4FB8B4",
    },
}

# AFTER: final tokens. Comments say where each value comes from.
COLORS = {
    "dark": {
        "bg": "#04222B",            # photo Abyss
        "surface": "#072F3A",       # derived: midpoint Abyss to Deep
        "surface-2": "#0A3D4A",     # photo Deep
        "surface-3": "#0C4351",     # derived: hovered rows, selected items
        "border": "#10606F",        # photo Harbor, decorative only
        "border-strong": "#4A9FA3", # derived from Lagoon, lifted for 3:1
        "text": "#E2F4F0",          # photo Mist
        "text-muted": "#98D8D0",    # photo Seafoam
        "text-subtle": "#8BB8B5",   # derived: desaturated Seafoam for captions
        "primary": "#4FB8B4",       # photo Tide, fill
        "primary-hover": "#6CCBC6", # derived: Tide lifted
        "primary-active": "#3FA5A1",# derived: Tide pressed
        "on-primary": "#04222B",    # photo Abyss
        "primary-text": "#4FB8B4",  # photo Tide, links (always underlined)
        "accent": "#98D8D0",        # photo Seafoam, icons and highlights
        "success": "#5FD49B",       # new hue, sits with teal
        "warning": "#F4C25B",       # new hue, warm counterpoint
        "danger": "#FF8F87",        # new hue
        "danger-solid": "#C8323E",  # destructive fill
        "danger-solid-hover": "#B02A36",
        "on-danger": "#FFFFFF",
        "focus": "#98D8D0",         # focus ring colour
        "overlay": "rgba(2, 18, 23, 0.72)",
        "header-bg": "rgba(4, 34, 43, 0.72)",
    },
    "light": {
        "bg": "#FFFFFF",
        "surface": "#F4FAF9",       # derived: Mist at 40%
        "surface-2": "#E2F4F0",     # photo Mist
        "surface-3": "#D3ECE7",     # derived
        "border": "#CFE5E1",        # decorative only
        "border-strong": "#55878A", # derived for 3:1
        "text": "#04222B",          # photo Abyss
        "text-muted": "#2F5A63",    # derived from Deep
        "text-subtle": "#466D74",   # derived
        "primary": "#10606F",       # photo Harbor, fill
        "primary-hover": "#0A3D4A", # photo Deep
        "primary-active": "#04222B",# photo Abyss
        "on-primary": "#FFFFFF",
        "primary-text": "#10606F",  # photo Harbor
        "accent": "#1D8B94",        # photo Lagoon, non-text graphics only (4.06 on white)
        "success": "#0B7046",
        "warning": "#8A5200",
        "danger": "#B42330",
        "danger-solid": "#C8323E",
        "danger-solid-hover": "#B02A36",
        "on-danger": "#FFFFFF",
        "focus": "#1D8B94",
        "overlay": "rgba(4, 34, 43, 0.48)",
        "header-bg": "rgba(255, 255, 255, 0.78)",
    },
}

EFFECTS = {
    "dark": {
        "gradient-brand": "linear-gradient(135deg, #1D8B94 0%, #98D8D0 100%)",
        "gradient-cta": "linear-gradient(135deg, #4FB8B4 0%, #98D8D0 100%)",
        "focus-ring": "0 0 0 2px var(--bg), 0 0 0 4px var(--focus)",
        "shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.40)",
        "shadow-md": "0 8px 24px rgba(0, 0, 0, 0.35)",
        "shadow-lg": "0 24px 48px rgba(0, 0, 0, 0.45)",
        "glow": "0 0 40px rgba(79, 184, 180, 0.30)",
    },
    "light": {
        "gradient-brand": "linear-gradient(135deg, #10606F 0%, #4FB8B4 100%)",
        "gradient-cta": "linear-gradient(135deg, #10606F 0%, #0A3D4A 100%)",
        "focus-ring": "0 0 0 2px var(--bg), 0 0 0 4px var(--focus)",
        "shadow-sm": "0 1px 2px rgba(4, 34, 43, 0.08)",
        "shadow-md": "0 8px 24px rgba(4, 34, 43, 0.10)",
        "shadow-lg": "0 24px 48px rgba(4, 34, 43, 0.14)",
        "glow": "0 0 40px rgba(29, 139, 148, 0.20)",
    },
}
CTA_ENDS = {"dark": (["#4FB8B4", "#98D8D0"], "#04222B"), "light": (["#10606F", "#0A3D4A"], "#FFFFFF")}

STATIC = {
    "font-display": "'Sora', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    "font-body": "'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    "font-mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "header-blur": "saturate(180%) blur(12px)",
    "blur-sm": "4px", "blur-md": "12px", "blur-lg": "24px",
    "radius-sm": "6px", "radius-md": "10px", "radius-lg": "16px", "radius-xl": "24px", "radius-full": "9999px",
    "ease-enter": "cubic-bezier(0.22, 1, 0.36, 1)", "ease-exit": "cubic-bezier(0.4, 0, 1, 1)",
    "duration-fast": "150ms", "duration-base": "250ms", "duration-slow": "400ms",
    "z-base": "0", "z-header": "100", "z-dropdown": "200", "z-drawer": "300",
    "z-modal": "400", "z-toast": "500", "z-tooltip": "600",
    "container": "1200px", "container-wide": "1440px",
}
SPACE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
TYPE = [  # name, size px, line-height px, tracking
    ("xs", 12, 16, "0"), ("sm", 14, 20, "0"), ("base", 16, 24, "0"), ("lg", 18, 28, "0"),
    ("xl", 20, 28, "0"), ("2xl", 24, 32, "0"), ("3xl", 30, 36, "0"), ("4xl", 36, 44, "-0.02em"),
    ("5xl", 48, 56, "-0.02em"), ("6xl", 60, 64, "-0.02em"), ("7xl", 72, 76, "-0.02em"),
]

def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def cr(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)

# Pairs: (foreground token, [background tokens], kind) ; kind text = 4.5, ui = 3.0
TEXT_FG = ["text", "text-muted", "text-subtle", "primary-text", "success", "warning", "danger"]
SURFACES = ["bg", "surface", "surface-2", "surface-3"]

def pairs(theme):
    c = COLORS[theme]; rows = []
    for fg in TEXT_FG:
        for bg in SURFACES:
            rows.append((fg, bg, "text", 4.5))
    if theme == "dark":
        for bg in SURFACES: rows.append(("accent", bg, "text", 4.5))
    else:
        for bg in SURFACES: rows.append(("accent", bg, "ui", 3.0))
    for bg in ["primary", "primary-hover", "primary-active"]: rows.append(("on-primary", bg, "text", 4.5))
    for bg in ["danger-solid", "danger-solid-hover"]: rows.append(("on-danger", bg, "text", 4.5))
    for bg in SURFACES: rows.append(("border-strong", bg, "ui", 3.0))
    for bg in SURFACES: rows.append(("focus", bg, "ui", 3.0))
    for bg in ["bg", "surface"]: rows.append(("primary", bg, "ui", 3.0))
    out = []
    for fg, bg, kind, need in rows:
        r = cr(c[fg], c[bg])
        out.append({"theme": theme, "fg": fg, "bg": bg, "fgHex": c[fg], "bgHex": c[bg],
                    "kind": kind, "need": need, "ratio": r, "pass": r >= need})
    ends, fgx = CTA_ENDS[theme]
    for i, e in enumerate(ends):
        r = cr(fgx, e)
        out.append({"theme": theme, "fg": "on-cta", "bg": f"gradient-cta {'start' if i == 0 else 'end'}",
                    "fgHex": fgx, "bgHex": e, "kind": "text", "need": 4.5, "ratio": r, "pass": r >= 4.5})
    return out

def before_pairs(theme):
    c = BEFORE[theme]; out = []
    spec = [("text", "surface-2", 4.5), ("text-muted", "surface-2", 4.5), ("text-subtle", "bg", 4.5),
            ("text-subtle", "surface-2", 4.5), ("primary-text", "bg", 4.5), ("primary-text", "surface-2", 4.5),
            ("on-primary", "primary", 4.5), ("border-strong", "surface-2", 3.0), ("border-strong", "bg", 3.0),
            ("focus", "bg", 3.0)]
    for fg, bg, need in spec:
        r = cr(c[fg], c[bg])
        out.append({"theme": theme, "fg": fg, "bg": bg, "fgHex": c[fg], "bgHex": c[bg], "need": need,
                    "ratio": r, "pass": r >= need,
                    "afterFgHex": COLORS[theme][fg], "afterBgHex": COLORS[theme][bg],
                    "afterRatio": cr(COLORS[theme][fg], COLORS[theme][bg])})
    return out

def block(theme):
    lines = [f"  --{k}: {v};" for k, v in COLORS[theme].items()]
    lines += [f"  --{k}: {v};" for k, v in EFFECTS[theme].items()]
    return "\n".join(lines)

def tokens_css():
    s = ["/* Mimix design tokens. Generated by gen.py from the Holst palette. Do not edit by hand. */",
         "/* Dark is the default theme. [data-theme=\"light\"] switches; no attribute follows dark. */",
         "", ":root {", "  color-scheme: dark;", block("dark")]
    s += [f"  --{k}: {v};" for k, v in STATIC.items()]
    s += [f"  --space-{i}: {px}px;" for i, px in enumerate(SPACE)]
    for n, sz, lh, tr in TYPE:
        s += [f"  --text-{n}: {sz / 16:g}rem; /* {sz}px */", f"  --leading-{n}: {lh / 16:g}rem; /* {lh}px */",
              f"  --tracking-{n}: {tr};"]
    s += ["}", "", ":root[data-theme=\"light\"] {", "  color-scheme: light;", block("light"), "}", "",
          "@media (max-width: 767.98px) {", "  :root {",
          "    /* Headings drop two steps below 768px: 72->48, 60->36, 48->30, 36->24 */",
          "    --text-7xl: 3rem; --leading-7xl: 3.5rem;", "    --text-6xl: 2.25rem; --leading-6xl: 2.75rem;",
          "    --text-5xl: 1.875rem; --leading-5xl: 2.25rem;", "    --text-4xl: 1.5rem; --leading-4xl: 2rem;",
          "  }", "}", "",
          "@media (prefers-reduced-motion: reduce) {", "  :root {",
          "    --duration-base: 150ms; --duration-slow: 150ms;", "  }",
          "  html { scroll-behavior: auto !important; }",
          "  *, *::before, *::after {",
          "    animation-duration: 150ms !important; animation-iteration-count: 1 !important;",
          "    transition-duration: 150ms !important; transition-property: opacity !important;",
          "    scroll-behavior: auto !important;",
          "  }",
          "  /* Looping indicators become still: spinner -> icon + 'Loading…', shimmer and indeterminate bars stop. */",
          "  .m-spinner__anim { display: none !important; }",
          "  .m-spinner__still { display: inline-flex !important; }",
          "  .skel::after, .m-progress.indet > div { animation: none !important; transform: none !important; }",
          "}", ""]
    return "\n".join(s)

def tailwind_css():
    s = ["/* Tailwind CSS v4 theme for Mimix. Import after tokens.css:",
         "   @import \"tailwindcss\"; @import \"./tokens.css\"; @import \"./tailwind-theme.css\"; */", "",
         "@custom-variant light (&:where([data-theme=light], [data-theme=light] *));", "",
         "@theme inline {"]
    for k in COLORS["dark"]:
        s.append(f"  --color-{k}: var(--{k});")
    s += ["  --font-display: var(--font-display);", "  --font-sans: var(--font-body);", "  --font-mono: var(--font-mono);",
          "  --radius-sm: var(--radius-sm);", "  --radius-md: var(--radius-md);", "  --radius-lg: var(--radius-lg);",
          "  --radius-xl: var(--radius-xl);", "  --shadow-sm: var(--shadow-sm);", "  --shadow-md: var(--shadow-md);",
          "  --shadow-lg: var(--shadow-lg);", "  --shadow-glow: var(--glow);",
          "  --ease-enter: var(--ease-enter);", "  --ease-exit: var(--ease-exit);"]
    for n, sz, lh, tr in TYPE:
        s += [f"  --text-{n}: var(--text-{n});", f"  --text-{n}--line-height: var(--leading-{n});",
              f"  --text-{n}--letter-spacing: var(--tracking-{n});"]
    s += ["}", "", "@theme {", "  --spacing: 4px;",
          "  --breakpoint-sm: 40rem;  /* 640px */", "  --breakpoint-md: 48rem;  /* 768px */",
          "  --breakpoint-lg: 64rem;  /* 1024px */", "  --breakpoint-xl: 80rem;  /* 1280px */",
          "  --breakpoint-2xl: 96rem; /* 1536px */", "  --container-content: 75rem; /* 1200px */",
          "  --container-wide: 90rem; /* 1440px */", "  --z-index-header: 100;", "}", ""]
    return "\n".join(s)

def contrast_md(allp, bef):
    s = ["# Mimix contrast table (WCAG 2.2 AA)", "",
         "Generated by `gen.py`. Text needs 4.5:1 (1.4.3). UI components, borders that identify a control and focus",
         "indicators need 3:1 (1.4.11). `--border` is decorative and exempt. Light `--accent` is for icons and graphics",
         "only, never text.", ""]
    for theme in ["dark", "light"]:
        rows = [p for p in allp if p["theme"] == theme]
        fails = [p for p in rows if not p["pass"]]
        s += [f"## {theme.title()} theme: {len(rows)} pairs, {len(fails)} failures", "",
              "| Foreground | Background | Hexes | Need | Ratio | Result |", "| --- | --- | --- | --- | --- | --- |"]
        for p in rows:
            s.append(f"| `{p['fg']}` | `{p['bg']}` | {p['fgHex']} on {p['bgHex']} | {p['need']}:1 | {p['ratio']:.2f} | {'Pass' if p['pass'] else 'FAIL'} |")
        s.append("")
    s += ["## Before and after (naive photo mapping vs final tokens)", "",
          "| Theme | Pair | Before | Ratio | After | Ratio |", "| --- | --- | --- | --- | --- | --- |"]
    for p in bef:
        s.append(f"| {p['theme']} | `{p['fg']}` on `{p['bg']}` | {p['fgHex']} on {p['bgHex']} | {p['ratio']:.2f} {'pass' if p['pass'] else 'FAIL'} | {p['afterFgHex']} on {p['afterBgHex']} | {p['afterRatio']:.2f} pass |")
    return "\n".join(s) + "\n"

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    allp = pairs("dark") + pairs("light")
    bef = before_pairs("dark") + before_pairs("light")
    assert all(p["pass"] for p in allp), [p for p in allp if not p["pass"]]
    assert all(p["afterRatio"] >= p["need"] for p in bef)
    open(f"{out}/tokens.css", "w").write(tokens_css())
    open(f"{out}/tailwind-theme.css", "w").write(tailwind_css())
    open(f"{out}/CONTRAST.md", "w").write(contrast_md(allp, bef))
    json.dump({"photo": PHOTO, "before": BEFORE, "colors": COLORS, "effects": EFFECTS, "pairs": allp,
               "beforePairs": bef}, open(f"{out}/tokens.json", "w"), indent=2)
    print(len(allp), "pairs pass;", sum(not p["pass"] for p in bef), "before-failures fixed")
