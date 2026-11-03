# Blend voices into one that’s never existed

Route `/voice-mixer` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (50/60) | Voice Mixer: blend two or three AI voices into one |
| Description (145/155) | Blend voices you own or that are licensed for remixing, fine-tune pitch, pace and warmth, and save a new voice that remembers where it came from. |
| Canonical | http://localhost:3000/voice-mixer |
| Robots | index, follow (default) |
| og:title / og:type | Voice Mixer: blend two or three AI voices into one / website |
| og:description | Blend voices you own or that are licensed for remixing, fine-tune pitch, pace and warmth, and save a new voice that remembers where it came from. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 Blend voices into one that’s never existed
  - h2 Try a blend
  - h2 From two voices to your voice in three steps
    - h3 Choose your sources
    - h3 Find the blend
    - h3 Fine-tune and save
  - h2 Every mix knows where it came from
  - h2 Questions, answered
    - h3 Which voices can I mix?
    - h3 What happens to the licence of a mix?
    - h3 Does previewing cost credits?
    - h3 Can I mix a clone of someone else?
  - h2 Make a voice that’s yours alone

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Blend voices into one that’s never existed

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Signature feature |
| h1 | Blend voices into one that’s never existed |
| p | Pick two voices and slide between them, or add a third and steer the blend on a triangle pad. Hear every change on a fixed sample sentence before you save. |

### 2. Try a blend

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 0px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Billing toggle (segmented control)**: Radix ToggleGroup type="single" (role="radio" items). Arrow keys move, Enter/Space selects; one value is always selected. A visually hidden role="status" announces "Showing annual prices, billed yearly" or "Showing monthly prices".
  - **Slider**: Radix Slider: role="slider" with aria-valuetext. Blend slider: 0 to 100 in steps of 1; fine-tune sliders: -1 to 1 in steps of 0.05, read as "Higher 40". Arrow keys step, PageUp/PageDown take 10 steps, Home/End go to the ends.

| Kind | Copy |
|---|---|
| h2 | Try a blend |
| button | Two voices |
| button | Three voices |
| label | Voice 1 |
| option | Wren |
| option | Atlas |
| option | Juniper |
| option | Koa |
| option | Sable |
| option | Indigo |
| option | Elio |
| option | Tamsin |
| option | Aisyah |
| label | Voice 2 |
| p | Current blend |
| li | Wren 50% |
| li | Atlas 50% |
| legend | Fine-tune |
| p | Sample sentence |
| p | “Every voice is a mix of the voices we grew up with.” |
| button | Preview blend |
| p | Saving needs a free account. Your mix keeps its sources and their weights. |
| link | Save as a new voice → `/signup` |
| p | You’re hearing the Mimix preview engine, which shapes speech-like sound from your text without real words. Studio-quality voices switch on when the voice engine is connected. |

### 3. From two voices to your voice in three steps

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | How it works |
| h2 | From two voices to your voice in three steps |
| li | Step 1Choose your sourcesPick two or three voices you own or that are licensed for remixing. The library marks which ones can be mixed. |
| h3 | Choose your sources |
| p | Pick two or three voices you own or that are licensed for remixing. The library marks which ones can be mixed. |
| li | Step 2Find the blendMove the slider or the pad and listen on the same sentence each time, so you hear only what changed. |
| h3 | Find the blend |
| p | Move the slider or the pad and listen on the same sentence each time, so you hear only what changed. |
| li | Step 3Fine-tune and saveNudge pitch, pace and warmth, then save. The new voice works everywhere Mimix speaks. |
| h3 | Fine-tune and save |
| p | Nudge pitch, pace and warmth, then save. The new voice works everywhere Mimix speaks. |

### 4. Every mix knows where it came from

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Lineage |
| h2 | Every mix knows where it came from |
| p | Mimix stores each mix’s sources and weights. A mix inherits the strictest licence of its sources, and if a source is taken down, the mixes built from it are switched off and their owners told why. |
| figcaption | Example lineage |
| p | Licence: standard (inherited from Marlow) |

### 5. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Which voices can I mix? |
| button | Which voices can I mix? |
| h3 | What happens to the licence of a mix? |
| button | What happens to the licence of a mix? |
| h3 | Does previewing cost credits? |
| button | Does previewing cost credits? |
| h3 | Can I mix a clone of someone else? |
| button | Can I mix a clone of someone else? |

### 6. Make a voice that’s yours alone

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Make a voice that’s yours alone |
| p | Previews are free. Save your first mix on any plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

- svg: “Wren 50%, Marlow 30%, Koa 20% → Harbor (your mix)”
