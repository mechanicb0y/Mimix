# Your voice, ready whenever you are

Route `/products/voice-cloning` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (43/60) | Voice Cloning with verified consent \| Mimix |
| Description (129/155) | Clone your own voice from a short sample or a longer dataset. Every clone is verified with a spoken phrase before it switches on. |
| Canonical | http://localhost:3000/products/voice-cloning |
| Robots | index, follow (default) |
| og:title / og:type | Voice Cloning with verified consent \| Mimix / website |
| og:description | Clone your own voice from a short sample or a longer dataset. Every clone is verified with a spoken phrase before it switches on. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Your voice, ready whenever you are
  - h2 Original and clone
  - h2 How it works
    - h3 Record or upload
    - h3 Read the phrase
    - h3 Use it anywhere
  - h2 What you get
    - h3 Consent on every clone
    - h3 Two levels of likeness
    - h3 A record you can show
    - h3 You decide on remixing
    - h3 Delete for good
    - h3 Public figures blocked
  - h2 The details
  - h2 Questions, answered
    - h3 Why do I have to read a phrase?
    - h3 Can I clone a friend’s voice?
    - h3 Who can use my clone?
  - h2 Works well with
    - h3 Voice Mixer
    - h3 Text to Speech
    - h3 Voice Changer
  - h2 Clone your voice in minutes

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Your voice, ready whenever you are

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Voice Cloning |
| h1 | Your voice, ready whenever you are |
| p | Record a short sample for an instant clone, or upload longer audio for a professional one. Either way, you prove it’s your voice before it works. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Original and clone |
| li | Original recording“Hi, this is my real voice, recorded on my laptop microphone.”0:05 |
| p | Original recording |
| p | “Hi, this is my real voice, recorded on my laptop microphone.” |
| li | Instant clone reading new text“And this is my clone, reading a script I never recorded.”0:05 |
| p | Instant clone reading new text |
| p | “And this is my clone, reading a script I never recorded.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Record or uploadInstant clones need about one minute of clean speech. Professional clones use 30 minutes or more. |
| h3 | Record or upload |
| p | Instant clones need about one minute of clean speech. Professional clones use 30 minutes or more. |
| li | Step 2Read the phraseWe show a random sentence. Read it aloud, and we match it to your samples to confirm it’s you. |
| h3 | Read the phrase |
| p | We show a random sentence. Read it aloud, and we match it to your samples to confirm it’s you. |
| li | Step 3Use it anywhereYour clone works in Text to Speech, Studio, Dubbing, the Voice Changer and the Voice Mixer. |
| h3 | Use it anywhere |
| p | Your clone works in Text to Speech, Studio, Dubbing, the Voice Changer and the Voice Mixer. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Consent on every cloneInstant or professional, every clone needs the speaker’s spoken verification. A checkbox is never enough. |
| h3 | Consent on every clone |
| p | Instant or professional, every clone needs the speaker’s spoken verification. A checkbox is never enough. |
| li | Two levels of likenessInstant clones are ready in minutes. Professional clones are trained on more audio for the closest match. |
| h3 | Two levels of likeness |
| p | Instant clones are ready in minutes. Professional clones are trained on more audio for the closest match. |
| li | A record you can showWe keep a consent record with the time, the phrase and a fingerprint of the audio. |
| h3 | A record you can show |
| p | We keep a consent record with the time, the phrase and a fingerprint of the audio. |
| li | You decide on remixingChoose whether your clone can be used in other people’s mixes. The default is no. |
| h3 | You decide on remixing |
| p | Choose whether your clone can be used in other people’s mixes. The default is no. |
| li | Delete for goodDelete a clone and its samples at any time. Mixes built from it stop working too. |
| h3 | Delete for good |
| p | Delete a clone and its samples at any time. Mixes built from it stop working too. |
| li | Public figures blockedA blocklist stops cloning of well-known voices, even with uploaded audio. |
| h3 | Public figures blocked |
| p | A blocklist stops cloning of well-known voices, even with uploaded audio. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Voice Cloning at a glance |
| th | Instant clone |
| th | Professional clone |
| th | Verification |
| th | Files |

### 5. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Why do I have to read a phrase? |
| button | Why do I have to read a phrase? |
| h3 | Can I clone a friend’s voice? |
| button | Can I clone a friend’s voice? |
| h3 | Who can use my clone? |
| button | Who can use my clone? |

### 6. Works well with

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Works well with |
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h3 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h3 | Text to Speech |
| p | Turn any script into natural speech. |
| link | Voice ChangerKeep your delivery, change the voice. → `/products/voice-changer` |
| h3 | Voice Changer |
| p | Keep your delivery, change the voice. |

### 7. Clone your voice in minutes

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Clone your voice in minutes |
| p | Instant cloning is included from the Maker plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
