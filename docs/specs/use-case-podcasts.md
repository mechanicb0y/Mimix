# Record less, fix faster, reach further

Route `/use-cases/podcasts` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (57/60) | AI tools for podcasters: clean, fix and translate \| Mimix |
| Description (127/155) | Clean noisy recordings, fix flubbed lines in your own voice, get searchable transcripts and publish episodes in more languages. |
| Canonical | http://localhost:3000/use-cases/podcasts |
| Robots | index, follow (default) |
| og:title / og:type | AI tools for podcasters: clean, fix and translate \| Mimix / website |
| og:description | Clean noisy recordings, fix flubbed lines in your own voice, get searchable transcripts and publish episodes in more languages. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 Record less, fix faster, reach further
  - h2 An episode opening
  - h2 What gets easier
    - h3 Noisy guests
    - h3 One wrong word
    - h3 Show notes take ages
  - h2 From raw recording to published episode
    - h3 Clean
    - h3 Transcribe
    - h3 Translate
  - h2 Tools for this job
    - h3 Studio
    - h3 Voice Isolator
    - h3 Speech to Text
    - h3 Dubbing
  - h2 Make your next episode easier

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Record less, fix faster, reach further

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | For podcasts |
| h1 | Record less, fix faster, reach further |
| p | Clean up noisy rooms, patch a stumbled line in your own voice and turn episodes into transcripts and other languages. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | An episode opening |
| li | An episode opening“You’re listening to Small Rooms, the show about big ideas from tiny studios.”0:06 |
| p | An episode opening |
| p | “You’re listening to Small Rooms, the show about big ideas from tiny studios.” |

### 2. What gets easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What gets easier |
| li | Noisy guestsThe Voice Isolator pulls speech out of cafés, cars and echoey rooms. |
| h3 | Noisy guests |
| p | The Voice Isolator pulls speech out of cafés, cars and echoey rooms. |
| li | One wrong wordType the correction and patch it in your verified clone. |
| h3 | One wrong word |
| p | Type the correction and patch it in your verified clone. |
| li | Show notes take agesGet a transcript with speakers and timestamps to write from. |
| h3 | Show notes take ages |
| p | Get a transcript with speakers and timestamps to write from. |

### 3. From raw recording to published episode

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | From raw recording to published episode |
| li | Step 1CleanRun each track through the Voice Isolator. |
| h3 | Clean |
| p | Run each track through the Voice Isolator. |
| li | Step 2TranscribeGet speaker-labelled text and captions. |
| h3 | Transcribe |
| p | Get speaker-labelled text and captions. |
| li | Step 3TranslateDub the episode so new audiences hear the same hosts. |
| h3 | Translate |
| p | Dub the episode so new audiences hear the same hosts. |

### 4. Tools for this job

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Tools for this job |
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |
| link | Voice IsolatorPull clean speech out of noise. → `/products/voice-isolator` |
| h3 | Voice Isolator |
| p | Pull clean speech out of noise. |
| link | Speech to TextTranscripts with timestamps and speakers. → `/products/speech-to-text` |
| h3 | Speech to Text |
| p | Transcripts with timestamps and speakers. |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |

### 5. Make your next episode easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Make your next episode easier |
| p | Start free with 10,000 credits every month. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
