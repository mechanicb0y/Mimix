# How can we help?

Route `/help` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (52/60) | Help center: plans, credits, voices and more \| Mimix |
| Description (140/155) | Answers about plans and billing, credits, voice cloning and consent, the Voice Mixer, downloads and your account. Search or browse by topic. |
| Canonical | http://localhost:3000/help |
| Robots | index, follow (default) |
| og:title / og:type | Help center: plans, credits, voices and more \| Mimix / website |
| og:description | Answers about plans and billing, credits, voice cloning and consent, the Voice Mixer, downloads and your account. Search or browse by topic. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · search · footer · nav "Footer"

Heading outline:

- h1 How can we help?
  - h2 Browse by topic
    - h3 Plans and billing
    - h3 When do my credits reset?
    - h3 How do I cancel?
    - h3 Can I get an invoice for my company?
    - h3 Voices and cloning
    - h3 Why was my clone rejected?
    - h3 How do I delete a voice?
    - h3 Can I publish my voice to the library?
    - h3 Voice Mixer
    - h3 Why can’t I mix a voice?
    - h3 What licence does my mix have?
    - h3 Generating and downloading
    - h3 Which formats can I download?
    - h3 A generation failed. Did I lose credits?
    - h3 Account and security
    - h3 How do I turn on two-factor authentication?
    - h3 How do I export my data?
  - h2 Still stuck?

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. How can we help?

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 80px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Search and filters**: role="search" form; every select has a visible label. Results count is announced through role="status". Filters and search text are mirrored to the URL (?gender=female&q=…) with history.replaceState, so a filtered view can be shared; the empty state offers a reset button.

| Kind | Copy |
|---|---|
| p | Help center |
| h1 | How can we help? |
| p | Search the most common questions, or browse by topic below. |
| label (screen reader only) | Search help articles |
| h2 | Browse by topic |
| h3 | Plans and billing |
| h3 | When do my credits reset? |
| button | When do my credits reset? |
| h3 | How do I cancel? |
| button | How do I cancel? |
| h3 | Can I get an invoice for my company? |
| button | Can I get an invoice for my company? |
| h3 | Voices and cloning |
| h3 | Why was my clone rejected? |
| button | Why was my clone rejected? |
| h3 | How do I delete a voice? |
| button | How do I delete a voice? |
| h3 | Can I publish my voice to the library? |
| button | Can I publish my voice to the library? |
| h3 | Voice Mixer |
| h3 | Why can’t I mix a voice? |
| button | Why can’t I mix a voice? |
| h3 | What licence does my mix have? |
| button | What licence does my mix have? |
| h3 | Generating and downloading |
| h3 | Which formats can I download? |
| button | Which formats can I download? |
| h3 | A generation failed. Did I lose credits? |
| button | A generation failed. Did I lose credits? |
| h3 | Account and security |
| h3 | How do I turn on two-factor authentication? |
| button | How do I turn on two-factor authentication? |
| h3 | How do I export my data? |
| button | How do I export my data? |

### 2. Still stuck?

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)

| Kind | Copy |
|---|---|
| h2 | Still stuck? |
| p | Email us and a real person will usually reply within one business day. |
| link | Email support → `mailto:support@example.com` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
