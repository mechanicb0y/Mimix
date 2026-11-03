# Describe a sound. Drop it in your edit.

Route `/products/sound-effects` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (52/60) | Sound Effects: generate any sound from a description |
| Description (139/155) | Describe a sound, like rain on a tin roof or a heavy door, and get clips to choose from. Royalty-free on paid plans and ready for any edit. |
| Canonical | http://localhost:3000/products/sound-effects |
| Robots | index, follow (default) |
| og:title / og:type | Sound Effects: generate any sound from a description / website |
| og:description | Describe a sound, like rain on a tin roof or a heavy door, and get clips to choose from. Royalty-free on paid plans and ready for any edit. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · region · footer · nav "Footer"

Heading outline:

- h1 Describe a sound. Drop it in your edit.
  - h2 Made from a single line of text
  - h2 How it works
    - h3 Describe it
    - h3 Pick a take
    - h3 Download
  - h2 What you get
    - h3 Variations per prompt
    - h3 Set the length
    - h3 Loop-friendly
    - h3 Royalty-free
    - h3 Saved to history
    - h3 Pairs with speech
  - h2 The details
  - h2 Made from a single line of text
  - h2 Questions, answered
    - h3 Can I use the effects in paid projects?
    - h3 How do I get better results?
    - h3 Can I make music with it?
  - h2 Works well with
    - h3 Text to Speech
    - h3 Studio
    - h3 Voice Design
  - h2 Your next sound is one sentence away

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Describe a sound. Drop it in your edit.

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Sound Effects |
| h1 | Describe a sound. Drop it in your edit. |
| p | Type “rain on a tin roof” or “heavy wooden door creaks shut” and get clips you can preview, trim and download. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |
| h2 (screen reader only) | Made from a single line of text |
| li | “Steady rain on a window, close up”0:06 |
| p | “Steady rain on a window, close up” |
| li | “Heavy door knock, three times”0:02 |
| p | “Heavy door knock, three times” |

### 2. How it works

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | How it works |
| li | Step 1Describe itWhat it is, where it happens and how it should feel. |
| h3 | Describe it |
| p | What it is, where it happens and how it should feel. |
| li | Step 2Pick a takeGet several variations and keep the one that fits. |
| h3 | Pick a take |
| p | Get several variations and keep the one that fits. |
| li | Step 3DownloadExport WAV or MP3 and drop it into your editor. |
| h3 | Download |
| p | Export WAV or MP3 and drop it into your editor. |

### 3. What you get

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What you get |
| li | Variations per promptEvery prompt returns several takes, so you’re choosing, not settling. |
| h3 | Variations per prompt |
| p | Every prompt returns several takes, so you’re choosing, not settling. |
| li | Set the lengthAsk for a short hit or a longer ambience. |
| h3 | Set the length |
| p | Ask for a short hit or a longer ambience. |
| li | Loop-friendlyAmbiences can be made to loop cleanly for games and long scenes. |
| h3 | Loop-friendly |
| p | Ambiences can be made to loop cleanly for games and long scenes. |
| li | Royalty-freeUse effects in commercial work on any paid plan. |
| h3 | Royalty-free |
| p | Use effects in commercial work on any paid plan. |
| li | Saved to historyFind past prompts and takes whenever you need them again. |
| h3 | Saved to history |
| p | Find past prompts and takes whenever you need them again. |
| li | Pairs with speechLayer effects under Text to Speech in Studio projects. |
| h3 | Pairs with speech |
| p | Layer effects under Text to Speech in Studio projects. |

### 4. The details

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | The details |
| caption (screen reader only) | Sound Effects at a glance |
| th | Cost |
| th | Downloads |
| th | Plans |

### 5. Made from a single line of text

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Made from a single line of text |
| li | “Steady rain on a window, close up”0:06 |
| p | “Steady rain on a window, close up” |
| li | “Heavy door knock, three times”0:02 |
| p | “Heavy door knock, three times” |
| li | “Busy café, people chatting”0:06 |
| p | “Busy café, people chatting” |

### 6. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Can I use the effects in paid projects? |
| button | Can I use the effects in paid projects? |
| h3 | How do I get better results? |
| button | How do I get better results? |
| h3 | Can I make music with it? |
| button | Can I make music with it? |

### 7. Works well with

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
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h3 | Studio |
| p | Long-form audiobooks and podcasts. |
| link | Voice DesignDescribe a voice and hear it. → `/products/voice-design` |
| h3 | Voice Design |
| p | Describe a voice and hear it. |

### 8. Your next sound is one sentence away

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Your next sound is one sentence away |
| p | Fifty free generations every month on the Free plan. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
