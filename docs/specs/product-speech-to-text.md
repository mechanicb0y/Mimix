# Every word, right where it was said

Route `/products/speech-to-text` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (57/60) | Speech to Text: accurate transcripts and captions \| Mimix |
| Description (129/155) | Upload audio or video and get an accurate transcript with timestamps. Edit it in the browser and export TXT, SRT or VTT captions. |
| Canonical | http://localhost:3000/products/speech-to-text |
| Robots | index, follow (default) |
| og:title / og:type | Speech to Text: accurate transcripts and captions \| Mimix / website |
| og:description | Upload audio or video and get an accurate transcript with timestamps. Edit it in the browser and export TXT, SRT or VTT captions. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Every word, right where it was said
  - h2 The audio behind a transcript
  - h2 How it works
    - h3 Upload
    - h3 Review
    - h3 Export
  - h2 What you get
    - h3 Word-level timing
    - h3 Click to hear
    - h3 Caption-ready exports
    - h3 Search inside
    - h3 Feeds dubbing
  - h2 The details
  - h2 Questions, answered
    - h3 How accurate is it?
    - h3 Do you keep my recordings?
  - h2 Works well with
    - h3 Dubbing
    - h3 Voice Isolator
    - h3 Studio
  - h2 Turn your next recording into text

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Every word, right where it was said

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Speech to Text |
| h1 | Every word, right where it was said |
| p | Upload an interview, lecture or episode and get a transcript with timestamps, ready to edit and export. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | The audio behind a transcript |
| li | Two-person interview, 12 seconds“So, how did the project start? Honestly, it began as a joke between two friends.”0:08 |
| p | Two-person interview, 12 seconds |
| p | “So, how did the project start? Honestly, it began as a joke between two friends.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1UploadAdd audio or video, or paste a link to a file you host. |
| h3 | Upload |
| p | Add audio or video, or paste a link to a file you host. |
| li | Step 2ReviewClick any word to hear it and fix names or terms. |
| h3 | Review |
| p | Click any word to hear it and fix names or terms. |
| li | Step 3ExportDownload plain text, or SRT and VTT captions for your video. |
| h3 | Export |
| p | Download plain text, or SRT and VTT captions for your video. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Word-level timingEvery word is timed, so captions line up and edits are precise. |
| h3 | Word-level timing |
| p | Every word is timed, so captions line up and edits are precise. |
| li | Click to hearSelect any line to play it back and check what was really said. |
| h3 | Click to hear |
| p | Select any line to play it back and check what was really said. |
| li | Caption-ready exportsSRT and VTT with sensible line lengths for video players. |
| h3 | Caption-ready exports |
| p | SRT and VTT with sensible line lengths for video players. |
| li | Search insideFind every mention of a word across a long recording. |
| h3 | Search inside |
| p | Find every mention of a word across a long recording. |
| li | Feeds dubbingSend a transcript straight to Dubbing to translate and re-voice it. |
| h3 | Feeds dubbing |
| p | Send a transcript straight to Dubbing to translate and re-voice it. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Speech to Text at a glance |
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
| h3 | How accurate is it? |
| button | How accurate is it? |
| h3 | Do you keep my recordings? |
| button | Do you keep my recordings? |

### 6. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |
| link | Voice IsolatorPull clean speech out of noise. → `/products/voice-isolator` |
| h3 | Voice Isolator |
| p | Pull clean speech out of noise. |
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |

### 7. Turn your next recording into text

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Turn your next recording into text |
| p | About 50 minutes of transcription fits in the free monthly credits. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
