# Scripts in, natural speech out

Route `/products/text-to-speech` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (48/60) | Text to Speech: natural AI voiceovers in seconds |
| Description (130/155) | Paste a script, pick a voice and tune stability, style and speed. Download MP3 or WAV and see the credit cost before you generate. |
| Canonical | http://localhost:3000/products/text-to-speech |
| Robots | index, follow (default) |
| og:title / og:type | Text to Speech: natural AI voiceovers in seconds / website |
| og:description | Paste a script, pick a voice and tune stability, style and speed. Download MP3 or WAV and see the credit cost before you generate. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Scripts in, natural speech out
  - h2 Listen to a few takes
  - h2 How it works
    - h3 Write or paste
    - h3 Pick a voice
    - h3 Tune and download
  - h2 What you get
    - h3 Cost before you click
    - h3 Four simple controls
    - h3 Pronunciation dictionary
    - h3 History you can reuse
    - h3 Streams for apps
    - h3 Provenance included
  - h2 The details
  - h2 Listen to a few takes
  - h2 Questions, answered
    - h3 What do stability and style do?
    - h3 Do failed generations cost credits?
  - h2 Works well with
    - h3 Voice Mixer
    - h3 Studio
    - h3 Voice Cloning
  - h2 Hear your script in a minute

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Scripts in, natural speech out

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Text to Speech |
| h1 | Scripts in, natural speech out |
| p | Paste a script, choose a voice and hear it straight away. Tune how steady, expressive or fast it sounds, then download the take you like. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Listen to a few takes |
| li | Audiobook narration · Marlow“Chapter one. The lighthouse keeper had not seen a ship in eleven days, and he had started to count the gulls instead.”0:11 |
| p | Audiobook narration · Marlow |
| p | “Chapter one. The lighthouse keeper had not seen a ship in eleven days, and he had started to count the gulls instead.” |
| li | Radio ad · Atlas“Fresh bread, every morning, from six. Come hungry, leave happy. Corner Bakery, on Harbour Street.”0:09 |
| p | Radio ad · Atlas |
| p | “Fresh bread, every morning, from six. Come hungry, leave happy. Corner Bakery, on Harbour Street.” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Write or pasteType or paste your script, with a live character count and credit estimate as you go. |
| h3 | Write or paste |
| p | Type or paste your script, with a live character count and credit estimate as you go. |
| li | Step 2Pick a voiceChoose from the library, your clones, your designs or your mixes. |
| h3 | Pick a voice |
| p | Choose from the library, your clones, your designs or your mixes. |
| li | Step 3Tune and downloadAdjust stability, similarity, style and speed. Regenerate any line and export MP3 or WAV. |
| h3 | Tune and download |
| p | Adjust stability, similarity, style and speed. Regenerate any line and export MP3 or WAV. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Cost before you clickThe editor shows characters, credits and the rough length of the audio before every generation. |
| h3 | Cost before you click |
| p | The editor shows characters, credits and the rough length of the audio before every generation. |
| li | Four simple controlsStability, similarity, style and speed, each with a plain-language hint about what it changes. |
| h3 | Four simple controls |
| p | Stability, similarity, style and speed, each with a plain-language hint about what it changes. |
| li | Pronunciation dictionaryTeach Mimix how to say brand names, acronyms and tricky words once, and it remembers. |
| h3 | Pronunciation dictionary |
| p | Teach Mimix how to say brand names, acronyms and tricky words once, and it remembers. |
| li | History you can reuseEvery take is saved with its settings, so you can replay, download or regenerate it later. |
| h3 | History you can reuse |
| p | Every take is saved with its settings, so you can replay, download or regenerate it later. |
| li | Streams for appsThe API streams audio as it’s made, so your app can start speaking almost straight away. |
| h3 | Streams for apps |
| p | The API streams audio as it’s made, so your app can start speaking almost straight away. |
| li | Provenance includedDownloads carry provenance data where the engine supports it, so your audience can trust the source. |
| h3 | Provenance included |
| p | Downloads carry provenance data where the engine supports it, so your audience can trust the source. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Text to Speech at a glance |
| th | Cost |
| th | Downloads |
| th | Plans |

### 5. Listen to a few takes

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Listen to a few takes |
| li | Audiobook narration · Marlow“Chapter one. The lighthouse keeper had not seen a ship in eleven days, and he had started to count the gulls instead.”0:11 |
| p | Audiobook narration · Marlow |
| p | “Chapter one. The lighthouse keeper had not seen a ship in eleven days, and he had started to count the gulls instead.” |
| li | Radio ad · Atlas“Fresh bread, every morning, from six. Come hungry, leave happy. Corner Bakery, on Harbour Street.”0:09 |
| p | Radio ad · Atlas |
| p | “Fresh bread, every morning, from six. Come hungry, leave happy. Corner Bakery, on Harbour Street.” |
| li | Game line · Tamsin“Oh, you found the secret door? Well then, I suppose you’d better come inside.”0:06 |
| p | Game line · Tamsin |
| p | “Oh, you found the secret door? Well then, I suppose you’d better come inside.” |

### 6. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | What do stability and style do? |
| button | What do stability and style do? |
| h3 | Do failed generations cost credits? |
| button | Do failed generations cost credits? |

### 7. Works well with

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
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h3 | Voice Cloning |
| p | Your own voice, verified by you. |

### 8. Hear your script in a minute

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Hear your script in a minute |
| p | Free accounts get 10,000 credits a month. No card needed. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
