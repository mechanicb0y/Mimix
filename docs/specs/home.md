# Two voices in. One voice out.

Route `/` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (50/60) | Mimix: AI voices you can mix, mimic and make yours |
| Description (148/155) | Text to speech, consent-verified voice cloning and the Voice Mixer, which blends two or three voices into a new one. Start free with 10,000 credits. |
| Canonical | http://localhost:3000/ |
| Robots | index, follow (default) |
| og:title / og:type | Mimix: AI voices you can mix, mimic and make yours / website |
| og:description | Text to speech, consent-verified voice cloning and the Voice Mixer, which blends two or three voices into a new one. Start free with 10,000 credits. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | Organization, WebSite, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · region · footer · nav "Footer"

Heading outline:

- h1 Two voices in. One voice out.
  - h2 Try it now
  - h2 Everything your voice work needs
    - h3 Create
      - h4 Text to Speech
      - h4 Voice Mixer
      - h4 Sound Effects
      - h4 Studio
    - h3 Voices
      - h4 Voice Library
      - h4 Voice Cloning
      - h4 Voice Design
      - h4 Voice Changer
    - h3 Edit audio
      - h4 Dubbing
      - h4 Speech to Text
      - h4 Voice Isolator
  - h2 Four voices, four moods
  - h2 Meet the Voice Mixer
  - h2 Real voices, with the speaker’s yes
    - h3 Every clone is verified
    - h3 Mixes keep their family tree
    - h3 Audio carries its origin
  - h2 Made for people who make things
    - h3 Creators
    - h3 Podcasts
    - h3 Education
    - h3 Games
    - h3 Business
  - h2 One API for every voice
  - h2 Questions, answered
    - h3 Is Mimix free to try?
    - h3 What makes the Voice Mixer different?
    - h3 Can I clone someone else’s voice?
    - h3 How are credits counted?
    - h3 Can I use Mimix audio commercially?
  - h2 Your next voice is a mix away

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Two voices in. One voice out.

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Live demo**: Textarea with visible label and live character count ("74 of 300 characters") linked by aria-describedby; over 300 characters sets aria-invalid, shows the error and disables Play. Voices are a radio group in a fieldset with a legend. Play calls POST /api/demo/tts (same-origin check, 20 requests a minute per client) and plays the returned WAV; the button turns into Stop. Errors and rate limits show inline and are announced by role="status".

| Kind | Copy |
|---|---|
| p | AI voice platform |
| h1 | Two voices in. One voice out. |
| p | Write it, pick a voice and hear it in seconds. Then blend voices in the Voice Mixer to make one nobody else has. |
| link | Start free → `/signup` |
| link | Explore the Voice Mixer → `/voice-mixer` |
| p | No card needed. 10,000 free credits every month. |
| h2 | Try it now |
| label | Text to speak |
| legend | Voice |
| label | WrenBritish · Young |
| label | AtlasAmerican · Middle-aged |
| label | JuniperAustralian · Middle-aged |
| label | MarlowScottish · Older |
| button | Play |
| p | You’re hearing the Mimix preview engine, which shapes speech-like sound from your text without real words. Studio-quality voices switch on when the voice engine is connected. |

### 2. Everything your voice work needs

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | One platform |
| h2 | Everything your voice work needs |
| p | Create speech, shape new voices and fix audio in one place, on one credit balance. |
| h3 | Create |
| link | Text to SpeechTurn any script into natural speech. → `/products/text-to-speech` |
| h4 | Text to Speech |
| p | Turn any script into natural speech. |
| link | Voice MixerBlend two or three voices into a new one. → `/voice-mixer` |
| h4 | Voice Mixer |
| p | Blend two or three voices into a new one. |
| link | Sound EffectsDescribe a sound, get the clip. → `/products/sound-effects` |
| h4 | Sound Effects |
| p | Describe a sound, get the clip. |
| link | StudioLong-form audiobooks and podcasts. → `/products/studio` |
| h4 | Studio |
| p | Long-form audiobooks and podcasts. |
| h3 | Voices |
| link | Voice LibraryBrowse voices ready to use or remix. → `/voice-library` |
| h4 | Voice Library |
| p | Browse voices ready to use or remix. |
| link | Voice CloningYour own voice, verified by you. → `/products/voice-cloning` |
| h4 | Voice Cloning |
| p | Your own voice, verified by you. |
| link | Voice DesignDescribe a voice and hear it. → `/products/voice-design` |
| h4 | Voice Design |
| p | Describe a voice and hear it. |
| link | Voice ChangerKeep your delivery, change the voice. → `/products/voice-changer` |
| h4 | Voice Changer |
| p | Keep your delivery, change the voice. |
| h3 | Edit audio |
| link | DubbingTranslate video and keep the voices. → `/products/dubbing` |
| h4 | Dubbing |
| p | Translate video and keep the voices. |
| link | Speech to TextTranscripts with timestamps and speakers. → `/products/speech-to-text` |
| h4 | Speech to Text |
| p | Transcripts with timestamps and speakers. |
| link | Voice IsolatorPull clean speech out of noise. → `/products/voice-isolator` |
| h4 | Voice Isolator |
| p | Pull clean speech out of noise. |

### 3. Four voices, four moods

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Hear the range |
| h2 | Four voices, four moods |
| p | Press play on any clip. Starting one pauses the others. |
| li | Wren · Calm narration“The river was quiet that morning, and the fog sat low over the water.”0:06 |
| p | Wren · Calm narration |
| p | “The river was quiet that morning, and the fog sat low over the water.” |
| li | Atlas · Upbeat ad read“This weekend only, every plan comes with double credits. Don’t miss it!”0:06 |
| p | Atlas · Upbeat ad read |
| p | “This weekend only, every plan comes with double credits. Don’t miss it!” |
| li | Koa · Game character“You want the key? Then you’ll have to catch me first!”0:04 |
| p | Koa · Game character |
| p | “You want the key? Then you’ll have to catch me first!” |
| li | Sable · Friendly lesson“Let’s break this down into three easy steps, starting with the first one.”0:06 |
| p | Sable · Friendly lesson |
| p | “Let’s break this down into three easy steps, starting with the first one.” |

### 4. Meet the Voice Mixer

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Slider**: Radix Slider: role="slider" with aria-valuetext. Blend slider: 0 to 100 in steps of 1; fine-tune sliders: -1 to 1 in steps of 0.05, read as "Higher 40". Arrow keys step, PageUp/PageDown take 10 steps, Home/End go to the ends.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Signature feature |
| h2 | Meet the Voice Mixer |
| p | Pick two voices, slide between them and hear the blend change live. Add a third voice and steer the mix on a triangle pad. |
| li | Blend two or three voices you own or that are licensed for remixing |
| li | Fine-tune pitch, pace and warmth after the blend |
| li | Every mix remembers its sources and their weights |
| link | Explore the Voice Mixer → `/voice-mixer` |
| p | Current blend |
| li | Wren 50% |
| li | Atlas 50% |
| p | Sample sentence |
| p | “Every voice is a mix of the voices we grew up with.” |
| button | Preview this blend |
| p | Drag the slider, then preview. This demo uses two library voices. |

### 5. Real voices, with the speaker’s yes

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Consent built in |
| h2 | Real voices, with the speaker’s yes |
| li | Every clone is verifiedThe speaker reads a random phrase out loud, and we match it to the samples before the voice switches on. Instant and professional clones alike. |
| h3 | Every clone is verified |
| p | The speaker reads a random phrase out loud, and we match it to the samples before the voice switches on. Instant and professional clones alike. |
| li | Mixes keep their family treeEach mixed voice records its sources. If a source is taken down, every mix built from it stops working too. |
| h3 | Mixes keep their family tree |
| p | Each mixed voice records its sources. If a source is taken down, every mix built from it stops working too. |
| li | Audio carries its originGenerated audio includes provenance data where the engine supports it, and anyone can check a clip with our public checker. |
| h3 | Audio carries its origin |
| p | Generated audio includes provenance data where the engine supports it, and anyone can check a clip with our public checker. |
| link | Read the voice cloning policy → `/legal/voice-cloning-policy` |

### 6. Made for people who make things

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Built for |
| h2 | Made for people who make things |
| link | CreatorsVoiceovers for videos, shorts and streams. → `/use-cases/creators` |
| h3 | Creators |
| p | Voiceovers for videos, shorts and streams. |
| link | PodcastsRecord less, fix faster, publish wider. → `/use-cases/podcasts` |
| h3 | Podcasts |
| p | Record less, fix faster, publish wider. |
| link | EducationLessons every learner can hear. → `/use-cases/education` |
| h3 | Education |
| p | Lessons every learner can hear. |
| link | GamesA cast of characters without a casting call. → `/use-cases/games` |
| h3 | Games |
| p | A cast of characters without a casting call. |
| link | BusinessSupport, training and ads in every language. → `/use-cases/business` |
| h3 | Business |
| p | Support, training and ads in every language. |

### 7. One API for every voice

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Tabs (code sample)**: Radix Tabs: arrow keys move between cURL, JavaScript and Python; the code block is focusable (tabindex="0") and scrolls horizontally. The Copy button confirms with "Copied", or says copying failed, through a polite live region.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | For developers |
| h2 | One API for every voice |
| p | Stream speech in real time, blend voices and transcribe audio with scoped keys, clear errors and webhooks. |
| li | Streaming text to speech |
| li | Scoped API keys and usage stats |
| li | OpenAPI spec with cURL, JavaScript and Python samples |
| link | Read the docs → `/developers` |
| button | cURL |
| button | JavaScript |
| button | Python |
| button | Copy code |

### 8. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | Is Mimix free to try? |
| button | Is Mimix free to try? |
| h3 | What makes the Voice Mixer different? |
| button | What makes the Voice Mixer different? |
| h3 | Can I clone someone else’s voice? |
| button | Can I clone someone else’s voice? |
| h3 | How are credits counted? |
| button | How are credits counted? |
| h3 | Can I use Mimix audio commercially? |
| button | Can I use Mimix audio commercially? |

### 9. Your next voice is a mix away

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Your next voice is a mix away |
| p | Start free, make your first clip in under a minute, and upgrade only when you need more. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
