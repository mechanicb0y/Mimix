# How the Voice Mixer blends two voices into one

Route `/blog/how-the-voice-mixer-works` · HTTP 200 · one H1: yes · copy source: `src/content/en/blog.ts`

## SEO

| Tag | Value |
|---|---|
| Title (46/60) | How the Voice Mixer blends two voices into one |
| Description (121/155) | A plain-language look at what happens when you slide between two voices, and why every mix keeps a record of its sources. |
| Canonical | http://localhost:3000/blog/how-the-voice-mixer-works |
| Robots | index, follow (default) |
| og:title / og:type | How the Voice Mixer blends two voices into one / article |
| og:description | A plain-language look at what happens when you slide between two voices, and why every mix keeps a record of its sources. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | BlogPosting, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · header · nav · footer · nav "Footer"

Heading outline:

- h1 How the Voice Mixer blends two voices into one
  - h2 What actually gets blended
  - h2 Adding a third voice
  - h2 Why mixes remember their sources
  - h2 On this page
  - h2 Keep reading
    - h3 Five ways to write better Voice Design prompts
    - h3 What spoken consent means for voice cloning
  - h2 Your next voice is a mix away

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. How the Voice Mixer blends two voices into one

- Element: `<article>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 32px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| link | Blog → `/blog` |
| p | Product |
| h1 | How the Voice Mixer blends two voices into one |
| p | A plain-language look at what happens when you slide between two voices, and why every mix keeps a record of its sources. |
| p | By The Mimix team · Published 28 October 2026 · 1 min read |
| p | Most voice tools let you adjust one voice. The Voice Mixer starts from a different question: what would it sound like if two voices had a child? |
| h2 | What actually gets blended |
| p | Every voice has measurable traits: its typical pitch, the shape of its vowels, how fast it moves and how much breath it carries. When you move the slider, Mimix blends those traits in proportion to the weights you choose. |
| li | Pitch blends on a musical scale, so a 50/50 mix lands where your ear expects it. |
| li | Timbre and pace blend smoothly in between. |
| li | Expressiveness follows the voice you weight more heavily. |
| h2 | Adding a third voice |
| p | With three voices, a slider isn’t enough. The triangle pad puts one voice in each corner, and the point you drag decides the weights. Keyboard users can move the point with the arrow keys. |
| h2 | Why mixes remember their sources |
| p | Every saved mix records which voices went into it and in what proportion. That record does two jobs: it sets the mix’s licence to the strictest of its sources, and it lets a takedown of one source switch off every mix built from it. |
| blockquote | A blend should carry where it came from. That’s what makes it safe to share. |
| p | A blend should carry where it came from. That’s what makes it safe to share. |
| p | Try it on the Voice Mixer page. Previews are free. |
| h2 | On this page |
| link | What actually gets blended → `#what-gets-blended` |
| link | Adding a third voice → `#three-voices` |
| link | Why mixes remember their sources → `#lineage` |
| link | Back to the blog → `/blog` |

### 2. Keep reading

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 48px / 48px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)

| Kind | Copy |
|---|---|
| h2 | Keep reading |
| link | Five ways to write better Voice Design promptsSmall changes to how you describe a voice make a big difference. Here are five habits that get you to the right voice in fewer tries. → `/blog/better-voice-design-prompts` |
| h3 | Five ways to write better Voice Design prompts |
| p | Small changes to how you describe a voice make a big difference. Here are five habits that get you to the right voice in fewer tries. |
| link | What spoken consent means for voice cloningWhy every Mimix clone, instant or professional, needs the speaker to read a random phrase, and what we store when they do. → `/blog/what-spoken-consent-means` |
| h3 | What spoken consent means for voice cloning |
| p | Why every Mimix clone, instant or professional, needs the speaker to read a random phrase, and what we store when they do. |

### 3. Your next voice is a mix away

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Your next voice is a mix away |
| p | Start free, make your first clip in under a minute, and upgrade only when you need more. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

- div: “Two teal lines meeting and continuing as one wave.”
