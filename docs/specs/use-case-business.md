# On-brand voice in every language

Route `/use-cases/business` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (59/60) | AI voice for business: support, training, marketing \| Mimix |
| Description (140/155) | Training videos, support lines and ads in every language, in a voice that stays on brand. Team seats, shared voices and enterprise security. |
| Canonical | http://localhost:3000/use-cases/business |
| Robots | index, follow (default) |
| og:title / og:type | AI voice for business: support, training, marketing \| Mimix / website |
| og:description | Training videos, support lines and ads in every language, in a voice that stays on brand. Team seats, shared voices and enterprise security. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 On-brand voice in every language
  - h2 A training video line
  - h2 What gets easier
    - h3 Inconsistent voiceovers
    - h3 Translation bottlenecks
    - h3 Security reviews
  - h2 Rolling out a brand voice
    - h3 Create the voice
    - h3 Share it
    - h3 Scale it
  - h2 Tools for this job
    - h3 Dubbing
    - h3 Text to Speech
    - h3 Voice Cloning
    - h3 Speech to Text
  - h2 Give your brand a voice

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. On-brand voice in every language

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | For business |
| h1 | On-brand voice in every language |
| p | Training, support and marketing audio in one consistent voice, with team seats, shared libraries and the controls your security team expects. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |
| h2 (screen reader only) | A training video line |
| li | A training video line“Welcome to your first week. Let’s start with how we look after our customers.”0:06 |
| p | A training video line |
| p | “Welcome to your first week. Let’s start with how we look after our customers.” |

### 2. What gets easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What gets easier |
| li | Inconsistent voiceoversOne shared brand voice for every team and every video. |
| h3 | Inconsistent voiceovers |
| p | One shared brand voice for every team and every video. |
| li | Translation bottlenecksDub training and product videos into new languages in days. |
| h3 | Translation bottlenecks |
| p | Dub training and product videos into new languages in days. |
| li | Security reviewsSSO, audit logs and a data processing agreement on Enterprise. |
| h3 | Security reviews |
| p | SSO, audit logs and a data processing agreement on Enterprise. |

### 3. Rolling out a brand voice

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Rolling out a brand voice |
| li | Step 1Create the voiceMix or design a brand voice, or clone a spokesperson with consent. |
| h3 | Create the voice |
| p | Mix or design a brand voice, or clone a spokesperson with consent. |
| li | Step 2Share itAdd it to your team library with roles for who can use it. |
| h3 | Share it |
| p | Add it to your team library with roles for who can use it. |
| li | Step 3Scale itProduce audio in the app or through the API. |
| h3 | Scale it |
| p | Produce audio in the app or through the API. |

### 4. Tools for this job

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Tools for this job |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h3 | Voice Cloning |
| p | Your own voice, verified by you. |
| link | Speech to TextTranscripts with timestamps and speakers. → `/products/speech-to-text` |
| h3 | Speech to Text |
| p | Transcripts with timestamps and speakers. |

### 5. Give your brand a voice

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Give your brand a voice |
| p | Talk to our team about volume, security and contracts. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
