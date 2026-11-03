# Voiceovers as fast as your ideas

Route `/use-cases/creators` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (51/60) | AI voiceovers for creators and video makers \| Mimix |
| Description (142/155) | Voiceovers for videos, shorts and streams in minutes. Use your own cloned voice, mix a signature voice and add sound effects, all on one plan. |
| Canonical | http://localhost:3000/use-cases/creators |
| Robots | index, follow (default) |
| og:title / og:type | AI voiceovers for creators and video makers \| Mimix / website |
| og:description | Voiceovers for videos, shorts and streams in minutes. Use your own cloned voice, mix a signature voice and add sound effects, all on one plan. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · footer · nav "Footer"

Heading outline:

- h1 Voiceovers as fast as your ideas
  - h2 A short intro read
  - h2 What gets easier
    - h3 Re-recording eats your day
    - h3 Your voice, even when you’re tired
    - h3 A sound that’s yours
  - h2 A typical video, start to finish
    - h3 Draft the script
    - h3 Add atmosphere
    - h3 Export and edit
  - h2 Tools for this job
    - h3 Text to Speech
    - h3 Voice Mixer
    - h3 Voice Changer
    - h3 Sound Effects
  - h2 Make your next video sound great

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Voiceovers as fast as your ideas

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | For creators |
| h1 | Voiceovers as fast as your ideas |
| p | Script, voice and sound for videos, shorts and streams, without booking a booth or re-recording every flubbed line. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | A short intro read |
| li | A short intro read“Hey everyone, welcome back. Today we’re testing three cameras under fifty dollars.”0:07 |
| p | A short intro read |
| p | “Hey everyone, welcome back. Today we’re testing three cameras under fifty dollars.” |

### 2. What gets easier

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What gets easier |
| li | Re-recording eats your dayFix one word by retyping it, not by setting up the mic again. |
| h3 | Re-recording eats your day |
| p | Fix one word by retyping it, not by setting up the mic again. |
| li | Your voice, even when you’re tiredClone your own voice once and keep the same energy across every upload. |
| h3 | Your voice, even when you’re tired |
| p | Clone your own voice once and keep the same energy across every upload. |
| li | A sound that’s yoursMix a signature channel voice that nobody else can use. |
| h3 | A sound that’s yours |
| p | Mix a signature channel voice that nobody else can use. |

### 3. A typical video, start to finish

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | A typical video, start to finish |
| li | Step 1Draft the scriptPaste it into Text to Speech and pick your clone or mix. |
| h3 | Draft the script |
| p | Paste it into Text to Speech and pick your clone or mix. |
| li | Step 2Add atmosphereGenerate a whoosh, a crowd or rain for the right moments. |
| h3 | Add atmosphere |
| p | Generate a whoosh, a crowd or rain for the right moments. |
| li | Step 3Export and editDownload WAV and drop it on your timeline. |
| h3 | Export and edit |
| p | Download WAV and drop it on your timeline. |

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
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h3 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | Voice ChangerKeep your delivery, change the voice. → `/products/voice-changer` |
| h3 | Voice Changer |
| p | Keep your delivery, change the voice. |
| link | Sound EffectsDescribe a sound, get the clip. → `/products/sound-effects` |
| h3 | Sound Effects |
| p | Describe a sound, get the clip. |

### 5. Make your next video sound great

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Make your next video sound great |
| p | Start free and voice your first short in minutes. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
