"""Builds the style guide page from template.html + gen.py tokens + Lucide SVGs.
Usage: python3 -I build.py <template> <lucide icons dir> <tokens.json> <out.html>
"""
import json, re, sys, os

tpl, icon_dir, tok_path, out = sys.argv[1:5]
tok = json.load(open(tok_path))

STATIC = """  --font-display: 'Sora', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-body: 'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --header-blur: saturate(180%) blur(12px);
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px; --radius-full: 9999px;
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1); --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --duration-fast: 150ms; --duration-base: 250ms; --duration-slow: 400ms;
  --z-header: 100; --z-dropdown: 200; --z-drawer: 300; --z-modal: 400; --z-toast: 500; --z-tooltip: 600;
  --container: 1200px; --container-wide: 1440px;
  --text-xs: 0.75rem; --leading-xs: 1rem; --text-sm: 0.875rem; --leading-sm: 1.25rem;
  --text-base: 1rem; --leading-base: 1.5rem; --text-lg: 1.125rem; --leading-lg: 1.75rem;
  --text-xl: 1.25rem; --leading-xl: 1.75rem; --text-2xl: 1.5rem; --leading-2xl: 2rem;
  --text-3xl: 1.875rem; --leading-3xl: 2.25rem; --text-4xl: 2.25rem; --leading-4xl: 2.75rem;
  --text-5xl: 3rem; --leading-5xl: 3.5rem; --text-6xl: 3.75rem; --leading-6xl: 4rem;
  --text-7xl: 4.5rem; --leading-7xl: 4.75rem;"""

def block(theme):
    lines = [f"  --{k}: {v};" for k, v in tok["colors"][theme].items()]
    lines += [f"  --{k}: {v};" for k, v in tok["effects"][theme].items()]
    return "\n".join(lines)

css = f""":root {{
  color-scheme: dark;
{block('dark')}
{STATIC}
}}
@media (prefers-color-scheme: light) {{
  :root:not([data-theme="dark"]) {{
    color-scheme: light;
{block('light')}
  }}
}}
:root[data-theme="light"] {{
  color-scheme: light;
{block('light')}
}}
:root[data-theme="dark"] {{
  color-scheme: dark;
{block('dark')}
}}
@media (max-width: 767.98px) {{
  :root {{ --text-7xl: 3rem; --leading-7xl: 3.5rem; --text-6xl: 2.25rem; --leading-6xl: 2.75rem;
    --text-5xl: 1.875rem; --leading-5xl: 2.25rem; --text-4xl: 1.5rem; --leading-4xl: 2rem; }}
}}"""

NAMES = ["play", "pause", "mic", "square", "upload", "download", "file-audio", "audio-waveform", "volume-2", "blend",
         "wand-sparkles", "sliders-horizontal", "settings", "search", "chevron-down", "chevron-left", "chevron-right",
         "check", "x", "plus", "copy", "trash-2", "info", "circle-check", "circle-x", "triangle-alert", "loader-circle",
         "bell", "hourglass", "user", "house", "library", "inbox", "sun", "moon", "monitor"]
icons = {}
for n in NAMES:
    s = open(os.path.join(icon_dir, n + ".svg")).read()
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\s+", " ", s).strip().replace("> <", "><")
    s = s.replace('stroke-width="2"', 'stroke-width="1.75"').replace('width="24" height="24" ', '')
    s = s.replace("<svg ", '<svg aria-hidden="true" focusable="false" ')
    icons[n] = s

html = open(tpl).read()
html = html.replace("/*@@TOKENS@@*/", css)
html = re.sub(r"@@I:([a-z0-9-]+)@@", lambda m: icons[m.group(1)], html)
data = {"photo": tok["photo"], "colors": tok["colors"], "pairs": tok["pairs"], "beforePairs": tok["beforePairs"]}
html = html.replace("/*@@DATA@@*/null", json.dumps(data, separators=(",", ":")))
html = html.replace("/*@@ICONS@@*/null", json.dumps(icons, separators=(",", ":")))
assert "@@" not in html, re.findall(r"@@[^@]*@@", html)[:5]
open(out, "w").write(html)
print(out, len(html) // 1024, "KB")
