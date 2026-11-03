# Every voice is a mix

Route `/about` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (50/60) | About Mimix: voices you can mix, made with consent |
| Description (146/155) | Mimix is an AI voice platform built on one idea: every voice is a mix. Here’s what we believe, how we handle consent and what we’re building next. |
| Canonical | http://localhost:3000/about |
| Robots | index, follow (default) |
| og:title / og:type | About Mimix: voices you can mix, made with consent / website |
| og:description | Mimix is an AI voice platform built on one idea: every voice is a mix. Here’s what we believe, how we handle consent and what we’re building next. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | Organization, AboutPage |

## Structure

Landmarks: header · nav "Main" · main · footer · nav "Footer"

Heading outline:

- h1 Every voice is a mix
  - h2 Why we started
  - h2 What we believe
    - h3 Consent first
    - h3 Show the cost
    - h3 Accessible by default
    - h3 Plain words
  - h2 How we keep voices safe
  - h2 Come make something

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Every voice is a mix

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 80px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)

| Kind | Copy |
|---|---|
| p | About |
| h1 | Every voice is a mix |
| p | You sound a little like the people who raised you, the places you lived and the voices you loved listening to. Mimix is built on that idea. |

### 2. Why we started

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Why we started |
| p | Pick two or three voices, blend them, and hear something new that still carries where it came from. That’s the Voice Mixer, and it’s the heart of Mimix. |
| p | Around it, we’re building everything a voice project needs: clone your own voice to read your scripts, design one from a few words, or dub a podcast into new languages with the same voices. |
| p | Every voice in Mimix comes with the speaker’s consent and a record of how it was made, so creators, studios and teachers can use what they make with confidence. |

### 3. What we believe

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What we believe |
| li | Consent firstNo clone without the speaker’s live yes. No exceptions for big customers. |
| h3 | Consent first |
| p | No clone without the speaker’s live yes. No exceptions for big customers. |
| li | Show the costYou see credits and minutes before you click, every time. |
| h3 | Show the cost |
| p | You see credits and minutes before you click, every time. |
| li | Accessible by defaultOur own product is built to meet WCAG 2.2 AA, and our tools help others meet it too. |
| h3 | Accessible by default |
| p | Our own product is built to meet WCAG 2.2 AA, and our tools help others meet it too. |
| li | Plain wordsIf we can’t explain a feature simply, we haven’t finished building it. |
| h3 | Plain words |
| p | If we can’t explain a feature simply, we haven’t finished building it. |

### 4. How we keep voices safe

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)

| Kind | Copy |
|---|---|
| h2 | How we keep voices safe |
| p | Spoken verification for every clone, a public-figure blocklist, lineage for every mix, provenance data on generated audio and a team that reviews reports. |
| link | Read the voice cloning policy → `/legal/voice-cloning-policy` |

### 5. Come make something

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Come make something |
| p | Start free, or get in touch if you’d like to work with us. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
