#!/usr/bin/env node
/**
 * Builds the page specs in docs/specs/ from the running site, so they always match the code.
 *
 *   npm run build && npx next start -p 3200   (in another terminal)
 *   npm run specs                              (or: SPECS_BASE_URL=http://localhost:3100 npm run specs)
 *
 * For every page it records structure (landmarks, heading outline, sections in order), the
 * components each section uses with their keyboard and screen reader behavior, all visible copy
 * and microcopy, alt text, and the SEO tags. docs/specs/README.md holds the shared reference:
 * every design token with its dark and light value, breakpoints, and the exact CSS of each component.
 */
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'specs')
const BASE = process.env.SPECS_BASE_URL ?? 'http://localhost:3200'

const PAGES = [
  ['home', '/'], ['voice-mixer', '/voice-mixer'], ['voice-library', '/voice-library'], ['pricing', '/pricing'], ['developers', '/developers'],
  ...['text-to-speech', 'voice-cloning', 'voice-design', 'voice-changer', 'speech-to-text', 'dubbing', 'sound-effects', 'voice-isolator', 'studio'].map((s) => [`product-${s}`, `/products/${s}`]),
  ...['creators', 'podcasts', 'education', 'games', 'business'].map((s) => [`use-case-${s}`, `/use-cases/${s}`]),
  ['about', '/about'], ['blog', '/blog'], ['blog-article', '/blog/how-the-voice-mixer-works'], ['contact-sales', '/contact-sales'], ['help', '/help'],
  ...['terms', 'privacy', 'acceptable-use', 'voice-cloning-policy'].map((s) => [`legal-${s}`, `/legal/${s}`]),
  ['404', '/this-page-does-not-exist'],
]

/** Component detectors: a CSS selector found inside a section maps to a behavior entry in README.md. */
const COMPONENTS = [
  ['.faq-trigger', 'faq', 'FAQ accordion'],
  ['.player-btn', 'player', 'Sample player'],
  ['.seg', 'segmented', 'Billing toggle (segmented control)'],
  ['[data-hero-demo], textarea + * , [role="region"] textarea', 'hero-demo', 'Live demo'],
  ['[role="slider"]:not(.player-wave)', 'slider', 'Slider'],
  ['.tri-pad', 'triangle', 'Triangle blend pad'],
  ['[role="tablist"]', 'tabs', 'Tabs (code sample)'],
  ['form[role="search"]', 'filters', 'Search and filters'],
  ['form:not([role="search"])', 'form', 'Form with inline validation'],
  ['table', 'table', 'Data table'],
  ['nav[aria-label="Breadcrumb"], nav[aria-label="breadcrumb"]', 'breadcrumbs', 'Breadcrumbs'],
  ['[data-reveal]', 'reveal', 'Scroll reveal'],
]

const BEHAVIOR = {
  header: ['Sticky at top: 0, 64px tall. After 8px of scroll it gets var(--header-bg), a 12px backdrop blur and a 1px var(--border) bottom line; back at 0px it clears.', 'Skip link is the first tab stop and moves focus to <main id="main" tabindex="-1">.', 'Theme toggle is a button whose label names the theme it switches to; the choice is saved in localStorage "mimix-theme" and applied before paint by an inline script.'],
  megamenu: ['Opens on hover after 150ms of intent (Radix delayDuration=150, skipDelayDuration=300) and on click or Enter/Space.', 'Trigger is a <button aria-expanded aria-controls>; the panel is a list of links grouped with role="group" and aria-label.', 'ArrowDown from the trigger enters the panel; ArrowDown/ArrowRight and ArrowUp/ArrowLeft move between links (wrapping); Home/End jump to first/last.', 'Esc closes the panel and returns focus to its trigger. Tab past the last link closes it.', 'Hidden below 1024px, where the drawer takes over.'],
  drawer: ['Below 1024px a menu button opens a right-side dialog (Radix Dialog): role="dialog", aria-modal, labelled by its title.', 'Focus moves into the dialog and is trapped; page scroll is locked; Esc, the close button, the overlay or any link closes it and focus returns to the menu button.', 'Sections are an accordion of 52px triggers; links are at least 44px tall.'],
  faq: ['Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first.', 'Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump.', 'Panels animate height in 250ms, instantly under reduced motion.'],
  player: ['Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration").', 'Starting any player pauses every other player on the page (shared audio bus).', 'The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks.', 'Load errors are announced through role="alert".'],
  segmented: ['Radix ToggleGroup type="single" (role="radio" items). Arrow keys move, Enter/Space selects; one value is always selected.', 'A visually hidden role="status" announces "Showing annual prices, billed yearly" or "Showing monthly prices".'],
  'hero-demo': ['Textarea with visible label and live character count ("74 of 300 characters") linked by aria-describedby; over 300 characters sets aria-invalid, shows the error and disables Play.', 'Voices are a radio group in a fieldset with a legend.', 'Play calls POST /api/demo/tts (same-origin check, 20 requests a minute per client) and plays the returned WAV; the button turns into Stop. Errors and rate limits show inline and are announced by role="status".'],
  slider: ['Radix Slider: role="slider" with aria-valuetext. Blend slider: 0 to 100 in steps of 1; fine-tune sliders: -1 to 1 in steps of 0.05, read as "Higher 40". Arrow keys step, PageUp/PageDown take 10 steps, Home/End go to the ends.'],
  triangle: ['Three-voice pad: the handle is role="slider" with aria-valuetext naming all three weights. Arrow keys move it 3% per press (Shift for 10%), Home recentres it; the position is clamped inside the triangle. Pointer drag uses pointer capture.'],
  tabs: ['Radix Tabs: arrow keys move between cURL, JavaScript and Python; the code block is focusable (tabindex="0") and scrolls horizontally. The Copy button confirms with "Copied", or says copying failed, through a polite live region.'],
  filters: ['role="search" form; every select has a visible label. Results count is announced through role="status".', 'Filters and search text are mirrored to the URL (?gender=female&q=…) with history.replaceState, so a filtered view can be shared; the empty state offers a reset button.'],
  form: ['noValidate form: fields validate on blur and on submit with the same zod schema the server uses. Errors sit under each field, linked by aria-describedby, with aria-invalid on the field.', 'On submit errors, an error summary (role="alert", tabindex="-1") takes focus and links to each field (Contact sales). Newsletter moves focus back to the email field.', 'Submitting disables the button and sets aria-busy; success and server errors are announced through role="status".', 'Contact sales has a hidden honeypot field; the APIs check same origin, rate limit (newsletter 5 a minute, contact 5 per 10 minutes per client) and validate again.'],
  table: ['Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading).', 'Check and dash cells carry visually hidden text ("Included" / "Not included").'],
  breadcrumbs: ['<nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.'],
  reveal: ['Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.'],
}

function extract() {
  const txt = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0) }
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null
  const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => {
    try { const j = JSON.parse(s.textContent); const nodes = j['@graph'] ?? (Array.isArray(j) ? j : [j]); return nodes.map((n) => n['@type']) } catch { return ['(invalid)'] }
  })
  const main = document.querySelector('main')
  const outline = Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4')).filter(visible).map((h) => ({ level: Number(h.tagName[1]), text: txt(h) }))
  const blocks = Array.from(main?.children ?? []).filter((c) => c.tagName !== 'SCRIPT').flatMap((c) => (c.tagName === 'DIV' && !c.querySelector(':scope > h1, :scope > h2') && c.children.length > 1 ? Array.from(c.children) : [c]))
  const sections = blocks.filter((s) => txt(s).length > 0).map((s, i) => {
    const heading = s.querySelector('h1, h2')
    const cls = String(s.className || '')
    const bg = cls.includes('raised') || getComputedStyle(s).backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'raised (var(--surface))' : 'page (var(--bg))'
    const pad = getComputedStyle(s)
    return {
      index: i + 1,
      tag: s.tagName.toLowerCase(),
      heading: heading ? `${heading.tagName.toLowerCase()}: ${txt(heading)}` : '(no heading)',
      labelled: s.getAttribute('aria-labelledby') ? 'aria-labelledby' : s.getAttribute('aria-label') ? `aria-label="${s.getAttribute('aria-label')}"` : null,
      padding: `${pad.paddingTop} / ${pad.paddingBottom}`,
      background: bg,
      copy: Array.from(s.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,blockquote,figcaption,caption,th,label,legend,button,a,option,[role="status"]'))
        .filter((e) => !e.closest('nav[aria-label="Breadcrumb"]') || e.tagName === 'A')
        .map((e) => {
          const t = txt(e); if (!t) return null
          const kind = e.tagName === 'A' ? 'link' : e.tagName === 'BUTTON' ? 'button' : e.tagName.toLowerCase()
          const inner = e.querySelector('h1,h2,h3,h4,p,li,a,button,label')
          if (inner && ['li', 'label', 'dd'].includes(kind) && txt(inner) === t) return null
          return { kind, text: t.length > 400 ? `${t.slice(0, 400)}…` : t, href: e.tagName === 'A' ? e.getAttribute('href') : undefined, srOnly: e.classList.contains('sr-only') || undefined }
        }).filter(Boolean)
        .filter((c, j, arr) => arr.findIndex((d) => d.kind === c.kind && d.text === c.text) === j),
    }
  })
  return {
    title: document.title, description: meta('meta[name="description"]'), canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
    robots: Array.from(document.querySelectorAll('meta[name="robots"]')).map((m) => m.content).join(' | ') || 'index, follow (default)',
    og: { title: meta('meta[property="og:title"]'), description: meta('meta[property="og:description"]'), type: meta('meta[property="og:type"]'), url: meta('meta[property="og:url"]'), image: meta('meta[property="og:image"]'), imageAlt: meta('meta[property="og:image:alt"]') },
    twitter: { card: meta('meta[name="twitter:card"]'), title: meta('meta[name="twitter:title"]'), image: meta('meta[name="twitter:image"]') },
    ld, h1Count: document.querySelectorAll('h1').length, outline,
    landmarks: Array.from(document.querySelectorAll('header, nav, main, footer, aside, [role="search"], [role="region"]')).filter(visible).map((l) => `${l.getAttribute('role') ?? l.tagName.toLowerCase()}${l.getAttribute('aria-label') ? ` "${l.getAttribute('aria-label')}"` : ''}`),
    images: Array.from(document.querySelectorAll('main img, main svg[role="img"], main [role="img"]')).map((i) => ({ el: i.tagName.toLowerCase(), alt: i.getAttribute('alt') ?? i.getAttribute('aria-label') ?? '' })),
    sections,
  }
}

async function readPage(page, path) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(150)
  const data = await page.evaluate(extract)
  const comps = await page.evaluate((list) => {
    const main = document.querySelector('main')
    const blocks = Array.from(main?.children ?? []).filter((c) => c.tagName !== 'SCRIPT').flatMap((c) => (c.tagName === 'DIV' && !c.querySelector(':scope > h1, :scope > h2') && c.children.length > 1 ? Array.from(c.children) : [c]))
      .filter((s) => (s.textContent ?? '').trim().length > 0)
    return blocks.map((s) => list.filter(([sel]) => { try { return s.matches(sel) || s.querySelector(sel) } catch { return false } }).map(([, key, name]) => [key, name]))
  }, COMPONENTS)
  data.sections.forEach((s, i) => { s.components = comps[i] ?? [] })
  return { status: res?.status() ?? 0, ...data }
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|')
const len = (s, max) => `${(s ?? '').length}/${max}${(s ?? '').length > max ? ' **over limit**' : ''}`

function pageMarkdown(slug, path, d, messagesHint) {
  const L = []
  L.push(`# ${d.outline.find((h) => h.level === 1)?.text ?? slug}`, '')
  L.push(`Route \`${path}\` · HTTP ${d.status} · one H1: ${d.h1Count === 1 ? 'yes' : `**no (${d.h1Count})**`} · copy source: ${messagesHint}`, '')
  L.push('## SEO', '', '| Tag | Value |', '|---|---|')
  L.push(`| Title (${len(d.title, 60)}) | ${esc(d.title)} |`)
  L.push(`| Description (${len(d.description, 155)}) | ${esc(d.description)} |`)
  L.push(`| Canonical | ${esc(d.canonical ?? '(none: error page)')} |`)
  L.push(`| Robots | ${esc(d.robots)} |`)
  L.push(`| og:title / og:type | ${esc(d.og.title)} / ${esc(d.og.type)} |`)
  L.push(`| og:description | ${esc(d.og.description)} |`)
  L.push(`| og:image | ${esc(d.og.image)} (1200×630) alt: ${esc(d.og.imageAlt)} |`)
  L.push(`| twitter:card | ${esc(d.twitter.card)} |`)
  L.push(`| JSON-LD | ${esc(d.ld.join(', ') || '(none)')} |`, '')
  L.push('## Structure', '', `Landmarks: ${d.landmarks.join(' · ')}`, '', 'Heading outline:', '')
  for (const h of d.outline) L.push(`${'  '.repeat(h.level - 1)}- h${h.level} ${h.text}`)
  L.push('', 'Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).', '')
  L.push('## Sections', '')
  for (const s of d.sections) {
    L.push(`### ${s.index}. ${s.heading.replace(/^h\d: /, '')}`, '')
    L.push(`- Element: \`<${s.tag}>\`${s.labelled ? `, ${s.labelled}` : ''}; heading ${s.heading.split(':')[0]}`)
    L.push(`- Styling: background ${s.background}; vertical padding ${s.padding} (64px / 96px at md and up for standard sections); content in \`.container-content\` (max-width 1200px, gutter 16/24/32px)`)
    if (s.components.length) {
      L.push(`- Components and behavior:`)
      for (const [key, name] of s.components) L.push(`  - **${name}**: ${BEHAVIOR[key].join(' ')}`)
    }
    if (s.copy.length) {
      L.push('', '| Kind | Copy |', '|---|---|')
      for (const c of s.copy) L.push(`| ${c.kind}${c.srOnly ? ' (screen reader only)' : ''} | ${esc(c.text)}${c.href ? ` → \`${c.href}\`` : ''} |`)
    }
    L.push('')
  }
  L.push('## Images and alt text', '')
  if (!d.images.length) L.push('No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.')
  else for (const i of d.images) L.push(`- ${i.el}: ${i.alt ? `“${i.alt}”` : 'decorative (empty alt)'}`)
  L.push('')
  return L.join('\n')
}

function tokenTables(css) {
  const block = (sel) => { const i = css.indexOf(sel); if (i < 0) return ''; const s = css.indexOf('{', i); let depth = 1, j = s + 1; while (depth && j < css.length) { if (css[j] === '{') depth++; if (css[j] === '}') depth--; j++ } return css.slice(s + 1, j - 1) }
  const vars = (b) => Object.fromEntries(Array.from(b.matchAll(/--([\w-]+):\s*([^;]+);/g)).map((m) => [m[1], m[2].trim()]))
  const dark = vars(block(':root {')); const light = vars(block(':root[data-theme="light"]'))
  const L = ['| Token | Dark (default) | Light |', '|---|---|---|']
  for (const [k, v] of Object.entries(dark)) L.push(`| \`--${k}\` | \`${esc(v)}\` | ${light[k] ? `\`${esc(light[k])}\`` : 'same'} |`)
  return L.join('\n')
}

function componentCss(css) {
  const rules = css.split('\n').filter((l) => /^\.(site-header|nav-trigger|mega-|drawer|faq|player|seg|m-btn|m-card|m-input|m-textarea|m-select|m-label|m-hint|m-error|m-badge|icon-tile|eyebrow|lead|link|skip-link|container|reveal|gradient-text|prose-mimix|tri)/.test(l))
  return ['```css', ...rules, '```'].join('\n')
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const index = []
  for (const [slug, path] of PAGES) {
    const d = await readPage(page, path)
    const hint = path.startsWith('/legal') ? '`src/content/en/legal.ts`' : path.startsWith('/blog/') ? '`src/content/en/blog.ts`' : '`src/i18n/messages/en/*`'
    await writeFile(join(OUT, `${slug}.md`), pageMarkdown(slug, path, d, hint))
    index.push({ slug, path, title: d.title, t: (d.title ?? '').length, dlen: (d.description ?? '').length, h1: d.h1Count, sections: d.sections.length, status: d.status })
    process.stdout.write(`${d.status} ${path}\n`)
  }
  await browser.close()

  const tokens = await readFile(join(ROOT, 'src/styles/tokens.css'), 'utf8')
  const globals = await readFile(join(ROOT, 'src/app/globals.css'), 'utf8')
  const R = []
  R.push('# Mimix marketing site: page specs', '')
  R.push(`Generated by \`npm run specs\` from the production build on ${new Date().toISOString().slice(0, 10)}. Do not edit the page files by hand: change the code or copy, then regenerate.`, '')
  R.push('Each page file lists its SEO tags with character counts, landmarks and heading outline, every section in order with its styling, the components it uses with keyboard and screen reader behavior, all copy and microcopy (including screen-reader-only text), and alt text.', '')
  R.push('Absolute URLs (canonical, og:url, og:image) come from `NEXT_PUBLIC_SITE_URL`, which is inlined at build time. This run used a build without it, so they show the localhost fallback; set it in Vercel before the production build.', '')
  R.push('## Pages', '', '| Page | Route | Title chars | Description chars | H1 | Sections |', '|---|---|---|---|---|---|')
  for (const p of index) R.push(`| [${esc(p.title)}](${p.slug}.md) | \`${p.path}\` | ${p.t} | ${p.dlen} | ${p.h1} | ${p.sections} |`)
  R.push('', '## Site chrome', '')
  for (const [k, name] of [['header', 'Sticky header'], ['megamenu', 'Mega-menu (1024px and up)'], ['drawer', 'Mobile drawer (below 1024px)']]) R.push(`### ${name}`, '', ...BEHAVIOR[k].map((b) => `- ${b}`), '')
  R.push('### Footer', '', '- `<footer>` with a labelled `<nav>` of five link columns (Products, Solutions, Developers, Company, Legal), the newsletter form and the copyright line. Background var(--surface), top border 1px var(--border).', '')
  R.push('## Component behavior reference', '')
  for (const [, key, name] of COMPONENTS) R.push(`### ${name}`, '', ...BEHAVIOR[key].map((b) => `- ${b}`), '')
  R.push('## Breakpoints and layout', '', '- Mobile first. Tailwind breakpoints: sm 640px, md 768px, lg 1024px (desktop nav), xl 1280px, 2xl 1536px.', '- `.container-content`: max-width 1200px; side gutter 16px, 24px from 640px, 32px from 1024px. `.container-wide`: max-width 1440px.', '- Header height 64px. Touch targets at least 44×44px. Body text 16px/26px Figtree; display Sora; code JetBrains Mono.', '')
  R.push('## Design tokens', '', 'From `src/styles/tokens.css` (generated in Phase 1). Reduced motion shortens --duration-base and --duration-slow to 150ms and stops looping animation after one cycle.', '', tokenTables(tokens), '')
  R.push('## Component CSS', '', 'Exact rules from `src/app/globals.css`; every value is a token or a fixed pixel size.', '', componentCss(globals), '')
  await writeFile(join(OUT, 'README.md'), R.join('\n'))
  console.log(`Wrote ${index.length} page specs and README.md to docs/specs/`)
}

main().catch((e) => { console.error(e); process.exit(1) })
