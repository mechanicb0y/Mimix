# Audiobooks and podcasts, chapter by chapter

Route `/products/studio` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (54/60) | Studio: audiobooks and podcasts with AI voices \| Mimix |
| Description (139/155) | Long-form projects with chapters, a voice per paragraph or speaker, sound effects and one-click export for audiobooks and podcast episodes. |
| Canonical | http://localhost:3000/products/studio |
| Robots | index, follow (default) |
| og:title / og:type | Studio: audiobooks and podcasts with AI voices \| Mimix / website |
| og:description | Long-form projects with chapters, a voice per paragraph or speaker, sound effects and one-click export for audiobooks and podcast episodes. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Audiobooks and podcasts, chapter by chapter
  - h2 A chapter opening
  - h2 How it works
    - h3 Import
    - h3 Cast and direct
    - h3 Export
  - h2 What you get
    - h3 Chapters built in
    - h3 A voice per speaker
    - h3 Line-level fixes
    - h3 Pronunciations once
    - h3 Background rendering
    - h3 Ready to publish
  - h2 The details
  - h2 Questions, answered
    - h3 Can I publish to audiobook stores?
    - h3 Can I use my own cloned voice?
  - h2 Works well with
    - h3 Text to Speech
    - h3 Voice Mixer
    - h3 Dubbing
  - h2 Start your audiobook today

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Audiobooks and podcasts, chapter by chapter

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Studio |
| h1 | Audiobooks and podcasts, chapter by chapter |
| p | Import a manuscript or script, assign a voice to each speaker or paragraph, and export finished chapters. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | A chapter opening |
| li | Chapter 3 · Two voices“Chapter three. “Are you sure about this?” asked Wren. “Not at all,” said Atlas, and opened the gate.”0:11 |
| p | Chapter 3 · Two voices |
| p | “Chapter three. “Are you sure about this?” asked Wren. “Not at all,” said Atlas, and opened the gate.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1ImportPaste text or import a document. Chapters are detected from your headings. |
| h3 | Import |
| p | Paste text or import a document. Chapters are detected from your headings. |
| li | Step 2Cast and directGive each speaker a voice, tune lines that need it and layer sound effects. |
| h3 | Cast and direct |
| p | Give each speaker a voice, tune lines that need it and layer sound effects. |
| li | Step 3ExportRender chapters in the background and download them one by one or all at once. |
| h3 | Export |
| p | Render chapters in the background and download them one by one or all at once. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Chapters built inWork on one chapter while others render, and track progress for each. |
| h3 | Chapters built in |
| p | Work on one chapter while others render, and track progress for each. |
| li | A voice per speakerAssign voices to characters once and Mimix keeps them consistent. |
| h3 | A voice per speaker |
| p | Assign voices to characters once and Mimix keeps them consistent. |
| li | Line-level fixesRegenerate a single sentence without touching the rest of the chapter. |
| h3 | Line-level fixes |
| p | Regenerate a single sentence without touching the rest of the chapter. |
| li | Pronunciations onceYour dictionary applies across the whole project. |
| h3 | Pronunciations once |
| p | Your dictionary applies across the whole project. |
| li | Background renderingClose the tab. We’ll email you when the export is ready. |
| h3 | Background rendering |
| p | Close the tab. We’ll email you when the export is ready. |
| li | Ready to publishExport MP3 or WAV per chapter, ready for your player or distributor. |
| h3 | Ready to publish |
| p | Export MP3 or WAV per chapter, ready for your player or distributor. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Studio at a glance |
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
| h3 | Can I publish to audiobook stores? |
| button | Can I publish to audiobook stores? |
| h3 | Can I use my own cloned voice? |
| button | Can I use my own cloned voice? |

### 6. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h3 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |

### 7. Start your audiobook today

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Start your audiobook today |
| p | Studio projects are included from the Pro plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
