# A full cast without a casting call

Route `/use-cases/games` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (55/60) | AI character voices and sound effects for games \| Mimix |
| Description (141/155) | Design and mix voices for every character, generate sound effects from text and prototype dialogue fast. Use the API to voice lines at scale. |
| Canonical | http://localhost:3000/use-cases/games |
| Robots | index, follow (default) |
| og:title / og:type | AI character voices and sound effects for games \| Mimix / website |
| og:description | Design and mix voices for every character, generate sound effects from text and prototype dialogue fast. Use the API to voice lines at scale. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 A full cast without a casting call
  - h2 A character line
  - h2 What gets easier
    - h3 Placeholder dialogue
    - h3 Too many characters
    - h3 Endless sound lists
  - h2 From script to playable scene
    - h3 Design the cast
    - h3 Batch the lines
    - h3 Drop into the engine
  - h2 Tools for this job
    - h3 Voice Design
    - h3 Voice Mixer
    - h3 Sound Effects
    - h3 Text to Speech
  - h2 Cast your game today

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. A full cast without a casting call

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | For games |
| h1 | A full cast without a casting call |
| p | Design a voice for every character, mix new ones for variety, and generate the sound effects around them. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | A character line |
| li | A character line“Halt, traveller. Nobody crosses this bridge without paying the toll.”0:05 |
| p | A character line |
| p | “Halt, traveller. Nobody crosses this bridge without paying the toll.” |

### 2. What gets easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What gets easier |
| li | Placeholder dialoguePrototype every line with real voices from day one. |
| h3 | Placeholder dialogue |
| p | Prototype every line with real voices from day one. |
| li | Too many charactersMix and design voices so every villager sounds different. |
| h3 | Too many characters |
| p | Mix and design voices so every villager sounds different. |
| li | Endless sound listsGenerate footsteps, doors and ambiences from a description. |
| h3 | Endless sound lists |
| p | Generate footsteps, doors and ambiences from a description. |

### 3. From script to playable scene

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | From script to playable scene |
| li | Step 1Design the castDescribe each character and keep the best take. |
| h3 | Design the cast |
| p | Describe each character and keep the best take. |
| li | Step 2Batch the linesSend your dialogue sheet through the API. |
| h3 | Batch the lines |
| p | Send your dialogue sheet through the API. |
| li | Step 3Drop into the engineExport WAV files named by line ID. |
| h3 | Drop into the engine |
| p | Export WAV files named by line ID. |

### 4. Tools for this job

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Tools for this job |
| link | Voice DesignDescribe a voice and hear it. → `/products/voice-design` |
| h3 | Voice Design |
| p | Describe a voice and hear it. |
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h3 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | Sound EffectsDescribe a sound, get the clip. → `/products/sound-effects` |
| h3 | Sound Effects |
| p | Describe a sound, get the clip. |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |

### 5. Cast your game today

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Cast your game today |
| p | Start free and prototype a full scene in an afternoon. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
