# Find your sound, then make a new one

Route `/voice-library` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (54/60) | Voice Library: preview AI voices ready to use or remix |
| Description (126/155) | Browse Mimix voices by language, accent, gender, age and use case. Play any voice in one click and see which ones you can mix. |
| Canonical | http://localhost:3000/voice-library |
| Robots | index, follow (default) |
| og:title / og:type | Voice Library: preview AI voices ready to use or remix / website |
| og:description | Browse Mimix voices by language, accent, gender, age and use case. Play any voice in one click and see which ones you can mix. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · search "Filter voices" · footer · nav "Footer"

Heading outline:

- h1 Find your sound, then make a new one
  - h2 Wren
  - h2 Atlas
  - h2 Juniper
  - h2 Koa
  - h2 Marlow
  - h2 Sable
  - h2 Indigo
  - h2 Noor
  - h2 Elio
  - h2 Tamsin
  - h2 Bram
  - h2 Aisyah
  - h2 Share your own voice
  - h2 Save the voices you love

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Find your sound, then make a new one

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 40px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| p | Voice Library |
| h1 | Find your sound, then make a new one |
| p | Browse voices by language, accent and mood. Every card plays in one click, and the badge tells you whether it can be mixed. |
| p | 12 voices in this preview |

### 2. Wren

- Element: `<section>`, aria-label="Filter voices"; heading h2
- Styling: background page (var(--bg)); vertical padding 0px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Sample player**: Play/pause button: 44×44px, aria-pressed and a label that names the clip ("Play Wren, calm narration"). Starting any player pauses every other player on the page (shared audio bus). The waveform is role="slider" with aria-valuemin/max/now in seconds and aria-valuetext as "0:04 of 0:11". Arrow keys seek 5% of the clip, PageUp/PageDown 20%, Home/End go to start/end; click or drag seeks. Load errors are announced through role="alert".
  - **Search and filters**: role="search" form; every select has a visible label. Results count is announced through role="status". Filters and search text are mirrored to the URL (?gender=female&q=…) with history.replaceState, so a filtered view can be shared; the empty state offers a reset button.

| Kind | Copy |
|---|---|
| label | Search voices |
| label | Language |
| option | Any |
| option | Arabic |
| option | English |
| option | German |
| option | Malay |
| option | Spanish |
| label | Accent |
| option | American |
| option | Australian |
| option | British |
| option | Castilian |
| option | Gulf |
| option | Indian |
| option | Irish |
| option | Malaysian |
| option | Scottish |
| option | Standard |
| label | Gender |
| option | Female |
| option | Male |
| option | Neutral |
| label | Age |
| option | Middle-aged |
| option | Older |
| option | Young |
| label | Use case |
| option | Advertising |
| option | Characters |
| option | Conversational |
| option | Education |
| option | Narration |
| option | News |
| p | 12 voices |
| li | WrenEnglish · BritishCan be mixedFemaleYoungNarration0:06 |
| h2 | Wren |
| p | English · British |
| li | Female |
| li | Young |
| li | Narration |
| li | AtlasEnglish · AmericanCan be mixedMaleMiddle-agedAdvertising0:05 |
| h2 | Atlas |
| p | English · American |
| li | Male |
| li | Middle-aged |
| li | Advertising |
| li | JuniperEnglish · AustralianCan be mixedFemaleMiddle-agedConversational0:05 |
| h2 | Juniper |
| p | English · Australian |
| li | Conversational |
| li | KoaEnglish · AmericanCan be mixedNeutralYoungCharacters0:05 |
| h2 | Koa |
| li | Neutral |
| li | Characters |
| li | MarlowEnglish · ScottishUse onlyMaleOlderNarration0:06 |
| h2 | Marlow |
| p | English · Scottish |
| li | Older |
| li | SableEnglish · AmericanCan be mixedFemaleOlderEducation0:06 |
| h2 | Sable |
| li | Education |
| li | IndigoEnglish · IndianCan be mixedMaleYoungNews0:05 |
| h2 | Indigo |
| p | English · Indian |
| li | News |
| li | NoorArabic · GulfUse onlyFemaleMiddle-agedConversational0:06 |
| h2 | Noor |
| p | Arabic · Gulf |
| li | ElioSpanish · CastilianCan be mixedMaleMiddle-agedAdvertising0:05 |
| h2 | Elio |
| p | Spanish · Castilian |
| li | TamsinEnglish · IrishCan be mixedFemaleYoungCharacters0:05 |
| h2 | Tamsin |
| p | English · Irish |
| li | BramGerman · StandardUse onlyMaleOlderEducation0:06 |
| h2 | Bram |
| p | German · Standard |
| li | AisyahMalay · MalaysianCan be mixedFemaleYoungEducation0:06 |
| h2 | Aisyah |
| p | Malay · Malaysian |

### 3. Share your own voice

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)

| Kind | Copy |
|---|---|
| h2 | Share your own voice |
| p | Publish a verified clone or a designed voice to the library. Every voice is reviewed by our moderation team before it appears, and you choose whether others may mix it. |
| link | Read the voice cloning policy → `/legal/voice-cloning-policy` |

### 4. Save the voices you love

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Save the voices you love |
| p | Sign up free to save voices, use them in every tool and publish your own. |
| link | Start free → `/signup` |
| link | See pricing → `/pricing` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
