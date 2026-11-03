# Notes on voice

Route `/blog` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (50/60) | Blog: voice craft, product news and guides \| Mimix |
| Description (129/155) | Guides to getting great results from AI voices, product updates from the Mimix team and our thinking on consent and voice safety. |
| Canonical | http://localhost:3000/blog |
| Robots | index, follow (default) |
| og:title / og:type | Blog: voice craft, product news and guides \| Mimix / website |
| og:description | Guides to getting great results from AI voices, product updates from the Mimix team and our thinking on consent and voice safety. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | Blog |

## Structure

Landmarks: header · nav "Main" · main · footer · nav "Footer"

Heading outline:

- h1 Notes on voice
  - h2 How the Voice Mixer blends two voices into one
  - h2 Five ways to write better Voice Design prompts
  - h2 What spoken consent means for voice cloning

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Notes on voice

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 80px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Billing toggle (segmented control)**: Radix ToggleGroup type="single" (role="radio" items). Arrow keys move, Enter/Space selects; one value is always selected. A visually hidden role="status" announces "Showing annual prices, billed yearly" or "Showing monthly prices".

| Kind | Copy |
|---|---|
| p | Blog |
| h1 | Notes on voice |
| p | Guides, product news and how we think about consent. |
| button | All posts |
| button | Guides |
| button | Product |
| button | Safety |
| li | Product · 28 October 2026 · 1 min readHow the Voice Mixer blends two voices into oneA plain-language look at what happens when you slide between two voices, and why every mix keeps a record of its sources. |
| p | Product · 28 October 2026 · 1 min read |
| h2 | How the Voice Mixer blends two voices into one |
| link | How the Voice Mixer blends two voices into one → `/blog/how-the-voice-mixer-works` |
| p | A plain-language look at what happens when you slide between two voices, and why every mix keeps a record of its sources. |
| li | Guides · 14 October 2026 · 1 min readFive ways to write better Voice Design promptsSmall changes to how you describe a voice make a big difference. Here are five habits that get you to the right voice in fewer tries. |
| p | Guides · 14 October 2026 · 1 min read |
| h2 | Five ways to write better Voice Design prompts |
| link | Five ways to write better Voice Design prompts → `/blog/better-voice-design-prompts` |
| p | Small changes to how you describe a voice make a big difference. Here are five habits that get you to the right voice in fewer tries. |
| li | Safety · 30 September 2026 · 1 min readWhat spoken consent means for voice cloningWhy every Mimix clone, instant or professional, needs the speaker to read a random phrase, and what we store when they do. |
| p | Safety · 30 September 2026 · 1 min read |
| h2 | What spoken consent means for voice cloning |
| link | What spoken consent means for voice cloning → `/blog/what-spoken-consent-means` |
| p | Why every Mimix clone, instant or professional, needs the speaker to read a random phrase, and what we store when they do. |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
