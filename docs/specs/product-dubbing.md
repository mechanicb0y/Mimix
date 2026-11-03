# One video, every language, the same voices

Route `/products/dubbing` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (56/60) | AI Dubbing: translate video and keep the original voices |
| Description (145/155) | Upload a video, pick target languages and get a dubbed version that keeps each speaker’s voice. Edit the transcript and timing before you export. |
| Canonical | http://localhost:3000/products/dubbing |
| Robots | index, follow (default) |
| og:title / og:type | AI Dubbing: translate video and keep the original voices / website |
| og:description | Upload a video, pick target languages and get a dubbed version that keeps each speaker’s voice. Edit the transcript and timing before you export. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 One video, every language, the same voices
  - h2 Original and dubbed
  - h2 How it works
    - h3 Upload and choose
    - h3 Edit the script
    - h3 Export
  - h2 What you get
    - h3 Voices that stay
    - h3 Editable transcript
    - h3 Timing that fits
    - h3 Background kept
    - h3 Progress you can see
    - h3 Captions included
  - h2 The details
  - h2 Questions, answered
    - h3 Do the speakers need to consent?
    - h3 Can I edit the translation?
    - h3 What happens to background music?
  - h2 Works well with
    - h3 Speech to Text
    - h3 Voice Cloning
    - h3 Studio
  - h2 Take your video global this week

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. One video, every language, the same voices

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Dubbing |
| h1 | One video, every language, the same voices |
| p | Upload a video, choose languages, and Mimix translates the speech and re-voices it in each speaker’s own voice. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Original and dubbed |
| li | Original line (English)“Welcome back to the kitchen. Today we’re making bread from scratch.”0:06 |
| p | Original line (English) |
| p | “Welcome back to the kitchen. Today we’re making bread from scratch.” |
| li | Dubbed line (Spanish), same voice“Bienvenidos de nuevo a la cocina. Hoy hacemos pan desde cero.”0:06 |
| p | Dubbed line (Spanish), same voice |
| p | “Bienvenidos de nuevo a la cocina. Hoy hacemos pan desde cero.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Upload and chooseAdd a video or audio file and pick one or more target languages. |
| h3 | Upload and choose |
| p | Add a video or audio file and pick one or more target languages. |
| li | Step 2Edit the scriptCheck the transcript and translation side by side and fix anything before voicing. |
| h3 | Edit the script |
| p | Check the transcript and translation side by side and fix anything before voicing. |
| li | Step 3ExportDownload the dubbed video, the audio track, or captions for each language. |
| h3 | Export |
| p | Download the dubbed video, the audio track, or captions for each language. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Voices that stayEach speaker sounds like themselves in the new language, with their consent on record. |
| h3 | Voices that stay |
| p | Each speaker sounds like themselves in the new language, with their consent on record. |
| li | Editable transcriptFix names, terms and tone in the translation before any audio is made. |
| h3 | Editable transcript |
| p | Fix names, terms and tone in the translation before any audio is made. |
| li | Timing that fitsLines are paced to match the original scene, so lips and cuts line up better. |
| h3 | Timing that fits |
| p | Lines are paced to match the original scene, so lips and cuts line up better. |
| li | Background keptMusic and sound effects stay under the new voices. |
| h3 | Background kept |
| p | Music and sound effects stay under the new voices. |
| li | Progress you can seeLong videos run in the background with live progress, and we notify you when they’re done. |
| h3 | Progress you can see |
| p | Long videos run in the background with live progress, and we notify you when they’re done. |
| li | Captions includedGet SRT and VTT for every language alongside the dub. |
| h3 | Captions included |
| p | Get SRT and VTT for every language alongside the dub. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Dubbing at a glance |
| th | Cost |
| th | Exports |
| th | Plans |

### 5. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Do the speakers need to consent? |
| button | Do the speakers need to consent? |
| h3 | Can I edit the translation? |
| button | Can I edit the translation? |
| h3 | What happens to background music? |
| button | What happens to background music? |

### 6. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | Speech to TextTranscripts with timestamps and speakers. → `/products/speech-to-text` |
| h3 | Speech to Text |
| p | Transcripts with timestamps and speakers. |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h3 | Voice Cloning |
| p | Your own voice, verified by you. |
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |

### 7. Take your video global this week

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Take your video global this week |
| p | Dubbing is included from the Maker plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
