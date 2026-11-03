# Describe a voice. Hear three takes on it.

Route `/products/voice-design` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (51/60) | Voice Design: create an AI voice from a description |
| Description (137/155) | Describe the voice you need, such as age, accent and tone, and get three versions to compare. Keep the one that fits and use it anywhere. |
| Canonical | http://localhost:3000/products/voice-design |
| Robots | index, follow (default) |
| og:title / og:type | Voice Design: create an AI voice from a description / website |
| og:description | Describe the voice you need, such as age, accent and tone, and get three versions to compare. Keep the one that fits and use it anywhere. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Describe a voice. Hear three takes on it.
  - h2 Voices made from a sentence
  - h2 How it works
    - h3 Describe it
    - h3 Compare three
    - h3 Refine or mix
  - h2 What you get
    - h3 Plain-language prompts
    - h3 Side-by-side previews
    - h3 Synthetic by design
    - h3 Ready for the mixer
    - h3 Save what you like
    - h3 Prompt tips built in
  - h2 The details
  - h2 Voices made from a sentence
  - h2 Questions, answered
    - h3 Do designed voices sound like real people?
    - h3 How specific should my description be?
    - h3 Can I use a designed voice commercially?
  - h2 Works well with
    - h3 Voice Mixer
    - h3 Text to Speech
    - h3 Voice Cloning
  - h2 Design the voice in your head

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Describe a voice. Hear three takes on it.

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Voice Design |
| h1 | Describe a voice. Hear three takes on it. |
| p | Type what you’re after, like “warm older narrator with a soft Scottish accent”, and Mimix gives you three versions to compare. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Voices made from a sentence |
| li | “Calm documentary narrator, deep and unhurried”“Beneath the ice, life carries on in the dark, slow and patient.”0:07 |
| p | “Calm documentary narrator, deep and unhurried” |
| p | “Beneath the ice, life carries on in the dark, slow and patient.” |
| li | “Cheerful young tour guide, quick and bright”“Right this way, everyone! The best view in the city is just up these stairs.”0:06 |
| p | “Cheerful young tour guide, quick and bright” |
| p | “Right this way, everyone! The best view in the city is just up these stairs.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Describe itAge, accent, tone, pace, mood. Plain words work best. |
| h3 | Describe it |
| p | Age, accent, tone, pace, mood. Plain words work best. |
| li | Step 2Compare threeListen to three candidates reading the same line, and keep the closest one. |
| h3 | Compare three |
| p | Listen to three candidates reading the same line, and keep the closest one. |
| li | Step 3Refine or mixAdjust the description and try again, or send your favourite to the Voice Mixer. |
| h3 | Refine or mix |
| p | Adjust the description and try again, or send your favourite to the Voice Mixer. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Plain-language promptsNo sliders to learn. Describe the person you hear in your head. |
| h3 | Plain-language prompts |
| p | No sliders to learn. Describe the person you hear in your head. |
| li | Side-by-side previewsAll three candidates read the same sentence, so you compare voices, not scripts. |
| h3 | Side-by-side previews |
| p | All three candidates read the same sentence, so you compare voices, not scripts. |
| li | Synthetic by designDesigned voices don’t copy a real person, so they’re yours to use without a consent step. |
| h3 | Synthetic by design |
| p | Designed voices don’t copy a real person, so they’re yours to use without a consent step. |
| li | Ready for the mixerDesigned voices can be mixed with your clones or library voices. |
| h3 | Ready for the mixer |
| p | Designed voices can be mixed with your clones or library voices. |
| li | Save what you likeKeep a voice and it appears in every Mimix tool straight away. |
| h3 | Save what you like |
| p | Keep a voice and it appears in every Mimix tool straight away. |
| li | Prompt tips built inExamples and hints help you get from vague to specific in one or two tries. |
| h3 | Prompt tips built in |
| p | Examples and hints help you get from vague to specific in one or two tries. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Voice Design at a glance |
| th | Cost |
| th | Prompt length |
| th | Saving |
| th | Plans |

### 5. Voices made from a sentence

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Voices made from a sentence |
| li | “Calm documentary narrator, deep and unhurried”“Beneath the ice, life carries on in the dark, slow and patient.”0:07 |
| p | “Calm documentary narrator, deep and unhurried” |
| p | “Beneath the ice, life carries on in the dark, slow and patient.” |
| li | “Cheerful young tour guide, quick and bright”“Right this way, everyone! The best view in the city is just up these stairs.”0:06 |
| p | “Cheerful young tour guide, quick and bright” |
| p | “Right this way, everyone! The best view in the city is just up these stairs.” |
| li | “Breathy villain, low and theatrical”“You came all this way for nothing. How very disappointing.”0:05 |
| p | “Breathy villain, low and theatrical” |
| p | “You came all this way for nothing. How very disappointing.” |

### 6. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Do designed voices sound like real people? |
| button | Do designed voices sound like real people? |
| h3 | How specific should my description be? |
| button | How specific should my description be? |
| h3 | Can I use a designed voice commercially? |
| button | Can I use a designed voice commercially? |

### 7. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h3 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h3 | Voice Cloning |
| p | Your own voice, verified by you. |

### 8. Design the voice in your head

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Design the voice in your head |
| p | Try a few descriptions free, then keep the ones you love. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
