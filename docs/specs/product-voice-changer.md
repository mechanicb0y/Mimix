# Your performance, a different voice

Route `/products/voice-changer` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (51/60) | Voice Changer: keep your delivery, change the voice |
| Description (132/155) | Record or upload speech and hear it in a different voice, with your timing, emotion and emphasis kept intact. MP3 or WAV in and out. |
| Canonical | http://localhost:3000/products/voice-changer |
| Robots | index, follow (default) |
| og:title / og:type | Voice Changer: keep your delivery, change the voice / website |
| og:description | Record or upload speech and hear it in a different voice, with your timing, emotion and emphasis kept intact. MP3 or WAV in and out. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Your performance, a different voice
  - h2 Before and after
  - h2 How it works
    - h3 Record or upload
    - h3 Pick a target voice
    - h3 Convert and compare
  - h2 What you get
    - h3 Delivery stays yours
    - h3 Record in the browser
    - h3 Before and after
    - h3 Noise cleanup option
    - h3 Consent applies
    - h3 Batch friendly
  - h2 The details
  - h2 Questions, answered
    - h3 Will it keep my accent?
    - h3 Can I change my voice live?
    - h3 Which voices can I convert into?
  - h2 Works well with
    - h3 Voice Cloning
    - h3 Voice Isolator
    - h3 Dubbing
  - h2 Perform once, cast anyone

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Your performance, a different voice

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Voice Changer |
| h1 | Your performance, a different voice |
| p | Act it out yourself, with your timing and emotion, then hear it in any voice you’re allowed to use. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Before and after |
| li | Original performance“Wait. Did you hear that? Something’s moving behind the door.”0:05 |
| p | Original performance |
| p | “Wait. Did you hear that? Something’s moving behind the door.” |
| li | Converted to Juniper“Wait. Did you hear that? Something’s moving behind the door.”0:05 |
| p | Converted to Juniper |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Record or uploadSpeak into your microphone or upload a clip. |
| h3 | Record or upload |
| p | Speak into your microphone or upload a clip. |
| li | Step 2Pick a target voiceChoose a library voice, a clone of your own, a design or a mix. |
| h3 | Pick a target voice |
| p | Choose a library voice, a clone of your own, a design or a mix. |
| li | Step 3Convert and comparePlay the original and the result side by side, then download. |
| h3 | Convert and compare |
| p | Play the original and the result side by side, then download. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Delivery stays yoursPauses, emphasis, whispers and laughs carry over into the new voice. |
| h3 | Delivery stays yours |
| p | Pauses, emphasis, whispers and laughs carry over into the new voice. |
| li | Record in the browserA built-in recorder with a level meter, so you know the take is clean before you convert. |
| h3 | Record in the browser |
| p | A built-in recorder with a level meter, so you know the take is clean before you convert. |
| li | Before and afterSwitch between the original and the converted clip with one key. |
| h3 | Before and after |
| p | Switch between the original and the converted clip with one key. |
| li | Noise cleanup optionRun the Voice Isolator first in the same step if your room is noisy. |
| h3 | Noise cleanup option |
| p | Run the Voice Isolator first in the same step if your room is noisy. |
| li | Consent appliesYou can only convert into voices you own or that are licensed for it. |
| h3 | Consent applies |
| p | You can only convert into voices you own or that are licensed for it. |
| li | Batch friendlyQueue several clips and get a notification when they’re all done. |
| h3 | Batch friendly |
| p | Queue several clips and get a notification when they’re all done. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Voice Changer at a glance |
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
| h3 | Will it keep my accent? |
| button | Will it keep my accent? |
| h3 | Can I change my voice live? |
| button | Can I change my voice live? |
| h3 | Which voices can I convert into? |
| button | Which voices can I convert into? |

### 6. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h3 | Voice Cloning |
| p | Your own voice, verified by you. |
| link | Voice IsolatorPull clean speech out of noise. → `/products/voice-isolator` |
| h3 | Voice Isolator |
| p | Pull clean speech out of noise. |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h3 | Dubbing |
| p | Translate video and keep the voices. |

### 7. Perform once, cast anyone

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Perform once, cast anyone |
| p | Try the Voice Changer free with your monthly credits. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
