# Lessons every learner can hear

Route `/use-cases/education` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (46/60) | AI voices for education and e-learning \| Mimix |
| Description (146/155) | Narrate lessons, translate courses and make every reading accessible with clear AI voices, transcripts and captions. Built for teachers and teams. |
| Canonical | http://localhost:3000/use-cases/education |
| Robots | index, follow (default) |
| og:title / og:type | AI voices for education and e-learning \| Mimix / website |
| og:description | Narrate lessons, translate courses and make every reading accessible with clear AI voices, transcripts and captions. Built for teachers and teams. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 Lessons every learner can hear
  - h2 A lesson introduction
  - h2 What gets easier
    - h3 Not every student reads easily
    - h3 Courses in one language
    - h3 Accessibility deadlines
  - h2 Turning a course into audio
    - h3 Import the text
    - h3 Pick a teacher voice
    - h3 Publish
  - h2 Tools for this job
    - h3 Text to Speech
    - h3 Dubbing
    - h3 Studio
    - h3 Speech to Text
  - h2 Give every lesson a voice

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Lessons every learner can hear

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | For education |
| h1 | Lessons every learner can hear |
| p | Turn slides, readings and courses into clear narration, with captions and translations for every student. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |
| h2 (screen reader only) | A lesson introduction |
| li | A lesson introduction“In this lesson, we’ll learn why the sky looks blue, and why sunsets look orange.”0:07 |
| p | A lesson introduction |
| p | “In this lesson, we’ll learn why the sky looks blue, and why sunsets look orange.” |

### 2. What gets easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What gets easier |
| li | Not every student reads easilyOffer an audio version of every reading in a calm, clear voice. |
| h3 | Not every student reads easily |
| p | Offer an audio version of every reading in a calm, clear voice. |
| li | Courses in one languageDub lectures so international students hear the same teacher. |
| h3 | Courses in one language |
| p | Dub lectures so international students hear the same teacher. |
| li | Accessibility deadlinesTranscripts and captions for every recorded lesson. |
| h3 | Accessibility deadlines |
| p | Transcripts and captions for every recorded lesson. |

### 3. Turning a course into audio

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Turning a course into audio |
| li | Step 1Import the textPaste lesson notes into Studio, one chapter per module. |
| h3 | Import the text |
| p | Paste lesson notes into Studio, one chapter per module. |
| li | Step 2Pick a teacher voiceUse a library voice or clone your own with consent. |
| h3 | Pick a teacher voice |
| p | Use a library voice or clone your own with consent. |
| li | Step 3PublishExport audio and captions to your learning platform. |
| h3 | Publish |
| p | Export audio and captions to your learning platform. |

### 4. Tools for this job

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Tools for this job |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |
| link | Speech to TextTranscripts with timestamps and speakers. → `/products/speech-to-text` |
| h3 | Speech to Text |
| p | Transcripts with timestamps and speakers. |

### 5. Give every lesson a voice

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Give every lesson a voice |
| p | Start free, or talk to us about school and university plans. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
