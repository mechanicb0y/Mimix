# Mimix design system (Phase 1)

Built from the Holst teal palette. Dark is the default theme. These files move into the `mimix` repo in Phase 3.

| File | What it is |
| --- | --- |
| `tokens.css` | All CSS custom properties: colour (dark on `:root`, light on `[data-theme="light"]`), effects, type, spacing, radius, motion, z-index, containers. Includes the under-768px heading step-down and reduced-motion overrides. |
| `tailwind-theme.css` | Tailwind CSS v4 (4.3.x) theme that maps utilities to the tokens: `bg-surface`, `text-text-muted`, `border-border-strong`, `rounded-md`, `text-4xl`, `shadow-glow`, `ease-enter`, and a `light:` variant. |
| `tokens.json` | Machine-readable tokens, the photo palette, the "before" mapping and every contrast pair with its ratio. |
| `CONTRAST.md` | WCAG 2.2 AA table: 98 pairs, 0 failures, plus the before/after table (14 failures in the raw photo mapping, all fixed). |
| `mimix-style-guide.html` | The living style guide: palette, before/after sheet, live contrast table, scales, motion, icons, grid, every component with its states, taglines and story. |
| `source/gen.py` | Single source of truth. Edit tokens here, then run `python3 -I gen.py <outdir>`. It refuses to write if any pair fails AA. |
| `source/build.py`, `source/template.html` | Rebuild the style guide: `python3 -I build.py template.html <lucide-static/icons> <outdir>/tokens.json <out.html>` (Lucide icons from `lucide-static@1.57.0`). |

## Usage in Next.js (Phase 3)

```css
/* app/globals.css */
@import "tailwindcss";
@import "./tokens.css";
@import "./tailwind-theme.css";
```

Set `data-theme="light"` on `<html>` for light mode. With no attribute the site is dark. The theme toggle stores the choice in a cookie so the server renders the right theme with no flash.

## Rules

- Primary buttons: solid `--primary` with `--on-primary` text. In dark that is dark text on Tide (6.97:1).
- `--gradient-brand` is for the logo, waveforms, borders and glows. Never behind body text.
- Light `--accent` (#1D8B94) is for icons and graphics only (4.06:1 on white). Use `--primary-text` for teal text.
- `--border` is decorative. Controls use `--border-strong` (3:1 or better on every surface).
- Every interactive element shows `--focus-ring` on keyboard focus.
- Status is never colour alone: badges and messages always carry an icon and words.
- Icons: Lucide, stroke 1.75, round caps and joins, 16/20/24px.
