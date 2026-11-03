# Give your product a voice

Route `/developers` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (48/60) | Developers: text to speech and voice API \| Mimix |
| Description (148/155) | Stream speech, mix voices and transcribe audio with one REST API. Scoped keys, webhooks, an OpenAPI spec and samples in cURL, JavaScript and Python. |
| Canonical | http://localhost:3000/developers |
| Robots | index, follow (default) |
| og:title / og:type | Developers: text to speech and voice API \| Mimix / website |
| og:description | Stream speech, mix voices and transcribe audio with one REST API. Scoped keys, webhooks, an OpenAPI spec and samples in cURL, JavaScript and Python. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, SoftwareApplication |

## Structure

Landmarks: header · nav "Main" · main · region · footer · nav "Footer"

Heading outline:

- h1 Give your product a voice
  - h2 Your first audio in three steps
    - h3 Create a key
    - h3 Send text
    - h3 Play the audio
  - h2 Audio that starts before the text ends
  - h2 Built for production
    - h3 Scoped keys
    - h3 Usage per key
    - h3 Webhooks
    - h3 OpenAPI spec
    - h3 Clear errors
    - h3 Same credits
  - h2 Endpoints at a glance
  - h2 Build with Mimix

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Give your product a voice

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 0px / 0px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Tabs (code sample)**: Radix Tabs: arrow keys move between cURL, JavaScript and Python; the code block is focusable (tabindex="0") and scrolls horizontally. The Copy button confirms with "Copied", or says copying failed, through a polite live region.

| Kind | Copy |
|---|---|
| p | Developers |
| h1 | Give your product a voice |
| p | One REST API for speech, voices and audio. Stream audio as it’s made, track usage per key and get webhooks when long jobs finish. |
| link | Get an API key → `/signup` |
| link | Jump to the quickstart → `#quickstart` |
| p | The API opens with the app launch. Join the newsletter to hear first. |
| button | cURL |
| button | JavaScript |
| button | Python |
| button | Copy code |

### 2. Your first audio in three steps

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Quickstart |
| h2 | Your first audio in three steps |
| li | Step 1Create a keyIn Settings → API keys, create a key with the speech scope. Keep it on your server, never in the browser. |
| h3 | Create a key |
| p | In Settings → API keys, create a key with the speech scope. Keep it on your server, never in the browser. |
| li | Step 2Send textPOST your text and a voice ID to the speech endpoint. |
| h3 | Send text |
| p | POST your text and a voice ID to the speech endpoint. |
| li | Step 3Play the audioThe response is audio. Save it, or stream it straight to your player. |
| h3 | Play the audio |
| p | The response is audio. Save it, or stream it straight to your player. |

### 3. Audio that starts before the text ends

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Tabs (code sample)**: Radix Tabs: arrow keys move between cURL, JavaScript and Python; the code block is focusable (tabindex="0") and scrolls horizontally. The Copy button confirms with "Copied", or says copying failed, through a polite live region.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| p | Streaming |
| h2 | Audio that starts before the text ends |
| p | The streaming endpoint sends audio in chunks as it’s generated, so voice assistants and games can start speaking almost at once. |
| button | JavaScript |
| button | Copy code |

### 4. Built for production

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Built for production |
| li | Scoped keysGive each key only the scopes it needs, like speech or transcription, and revoke it in one click. |
| h3 | Scoped keys |
| p | Give each key only the scopes it needs, like speech or transcription, and revoke it in one click. |
| li | Usage per keySee requests, characters and minutes per key, per day. |
| h3 | Usage per key |
| p | See requests, characters and minutes per key, per day. |
| li | WebhooksGet signed callbacks when dubbing, Studio exports and other long jobs finish. |
| h3 | Webhooks |
| p | Get signed callbacks when dubbing, Studio exports and other long jobs finish. |
| li | OpenAPI specGenerate clients in your language from a spec that matches the live API. |
| h3 | OpenAPI spec |
| p | Generate clients in your language from a spec that matches the live API. |
| li | Clear errorsEvery error has a code, a message you can show users and a link to the fix. |
| h3 | Clear errors |
| p | Every error has a code, a message you can show users and a link to the fix. |
| li | Same creditsAPI calls draw from your plan’s credits, so there’s one balance to watch. |
| h3 | Same credits |
| p | API calls draw from your plan’s credits, so there’s one balance to watch. |

### 5. Endpoints at a glance

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Endpoints at a glance |
| caption (screen reader only) | Main API endpoints |
| th | Method |
| th | Path |
| th | What it does |
| th | /v1/speech |
| th | /v1/speech/stream |
| th | /v1/voices/mix |
| th | /v1/voices/design |
| th | /v1/transcriptions |
| th | /v1/voices |

### 6. Build with Mimix

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Build with Mimix |
| p | Free accounts include API access with the monthly credits. |
| link | Get an API key → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
