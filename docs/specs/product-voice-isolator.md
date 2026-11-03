# Clean speech from noisy recordings

Route `/products/voice-isolator` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (51/60) | Voice Isolator: remove background noise from speech |
| Description (127/155) | Pull clean speech out of wind, traffic, hum and crowd noise. Upload audio or video and download a clean voice track in seconds. |
| Canonical | http://localhost:3000/products/voice-isolator |
| Robots | index, follow (default) |
| og:title / og:type | Voice Isolator: remove background noise from speech / website |
| og:description | Pull clean speech out of wind, traffic, hum and crowd noise. Upload audio or video and download a clean voice track in seconds. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Clean speech from noisy recordings
  - h2 Before and after
  - h2 How it works
    - h3 Upload
    - h3 Isolate
    - h3 Compare and download
  - h2 What you get
    - h3 Handles real-world noise
    - h3 Before and after
    - h3 Keeps the voice natural
    - h3 Video in, video out
    - h3 Works before other tools
    - h3 Fast
  - h2 The details
  - h2 Questions, answered
    - h3 Will it remove music too?
    - h3 Can it fix echo?
    - h3 Is my file stored?
  - h2 Works well with
    - h3 Speech to Text
    - h3 Voice Changer
    - h3 Dubbing
  - h2 Rescue your next recording

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Clean speech from noisy recordings

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Voice Isolator |
| h1 | Clean speech from noisy recordings |
| p | Wind, traffic, fans, hum, a busy café. Upload the recording and get just the voice back. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Before and after |
| li | Street interview, original“I’ve lived on this street for twenty years and it’s never been this busy.”0:05 |
| p | Street interview, original |
| p | “I’ve lived on this street for twenty years and it’s never been this busy.” |
| li | Same clip, voice isolated“I’ve lived on this street for twenty years and it’s never been this busy.”0:05 |
| p | Same clip, voice isolated |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1UploadAdd an audio or video file. |
| h3 | Upload |
| p | Add an audio or video file. |
| li | Step 2IsolateMimix separates the voice from everything else. |
| h3 | Isolate |
| p | Mimix separates the voice from everything else. |
| li | Step 3Compare and downloadSwitch between before and after, then export the clean track. |
| h3 | Compare and download |
| p | Switch between before and after, then export the clean track. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Handles real-world noiseBuilt for outdoor interviews, home studios and phone recordings. |
| h3 | Handles real-world noise |
| p | Built for outdoor interviews, home studios and phone recordings. |
| li | Before and afterFlip between the original and the clean version as it plays. |
| h3 | Before and after |
| p | Flip between the original and the clean version as it plays. |
| li | Keeps the voice naturalRemoves noise without the underwater sound of older filters. |
| h3 | Keeps the voice natural |
| p | Removes noise without the underwater sound of older filters. |
| li | Video in, video outUpload a video and get it back with a clean voice track. |
| h3 | Video in, video out |
| p | Upload a video and get it back with a clean voice track. |
| li | Works before other toolsClean audio first for better transcripts, clones and conversions. |
| h3 | Works before other tools |
| p | Clean audio first for better transcripts, clones and conversions. |
| li | FastMost files finish in less time than they take to play. |
| h3 | Fast |
| p | Most files finish in less time than they take to play. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Voice Isolator at a glance |
| th | Cost |
| th | Files |
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
| h3 | Will it remove music too? |
| button | Will it remove music too? |
| h3 | Can it fix echo? |
| button | Can it fix echo? |
| h3 | Is my file stored? |
| button | Is my file stored? |

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
| link | Voice ChangerKeep your delivery, change the voice. → `/products/voice-changer` |
| h3 | Voice Changer |
| p | Keep your delivery, change the voice. |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |

### 7. Rescue your next recording

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Rescue your next recording |
| p | Ten free minutes every month on the Free plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
