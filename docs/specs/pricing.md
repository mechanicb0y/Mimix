# Simple plans, honest credits

Route `/pricing` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (46/60) | Pricing: plans for every voice project \| Mimix |
| Description (138/155) | Start free with 10,000 credits a month. Paid plans from $9 add a commercial licence, voice cloning and more. Save 20% with annual billing. |
| Canonical | http://localhost:3000/pricing |
| Robots | index, follow (default) |
| og:title / og:type | Pricing: plans for every voice project \| Mimix / website |
| og:description | Start free with 10,000 credits a month. Paid plans from $9 add a commercial licence, voice cloning and more. Save 20% with annual billing. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, SoftwareApplication, FAQPage |

## Structure

Landmarks: header · nav "Main" · main · region · region · footer · nav "Footer"

Heading outline:

- h1 Simple plans, honest credits
  - h2 Plans
    - h3 Free
    - h3 Maker
    - h3 Pro
    - h3 Production
    - h3 Team
    - h3 Enterprise
  - h2 What a credit buys
  - h2 Compare plans
  - h2 API pricing
  - h2 Questions, answered
    - h3 What happens to unused credits?
    - h3 Can I switch plans any time?
    - h3 What if a payment fails?
    - h3 Can I buy more credits without upgrading?
    - h3 Do prices include tax?
    - h3 Which payment methods do you accept?
  - h2 Not sure which plan fits?

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Simple plans, honest credits

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 80px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Billing toggle (segmented control)**: Radix ToggleGroup type="single" (role="radio" items). Arrow keys move, Enter/Space selects; one value is always selected. A visually hidden role="status" announces "Showing annual prices, billed yearly" or "Showing monthly prices".

| Kind | Copy |
|---|---|
| p | Pricing |
| h1 | Simple plans, honest credits |
| p | Every plan shares one credit balance across all tools. You always see the cost in minutes before you generate. |
| h2 (screen reader only) | Plans |
| button | Monthly |
| button | Annual · Save 20% |
| p (screen reader only) | Showing monthly prices |
| li | FreeTry every tool on personal projects.$0Free foreverStart free10,000 credits a monthAbout 10 min of speech1 seat3 custom voicesVoice Mixer with 2 voicesPersonal use only |
| h3 | Free |
| p | Try every tool on personal projects. |
| p | $0 |
| p | Free forever |
| link | Start free → `/signup?plan=free` |
| li | 10,000 credits a month |
| li | About 10 min of speech |
| li | 1 seat |
| li | 3 custom voices |
| li | Voice Mixer with 2 voices |
| li | Personal use only |
| li | MakerFor creators publishing regularly.$9/monthBilled monthlyChoose Maker40,000 credits a monthAbout 40 min of speech1 seat10 custom voicesVoice Mixer with 3 voicesCommercial licenceInstant voice cloning |
| h3 | Maker |
| p | For creators publishing regularly. |
| p | $9/month |
| p | Billed monthly |
| link | Choose Maker → `/signup?plan=maker` |
| li | 40,000 credits a month |
| li | About 40 min of speech |
| li | 10 custom voices |
| li | Voice Mixer with 3 voices |
| li | Commercial licence |
| li | Instant voice cloning |
| li | Most popularProFor audiobooks, podcasts and serious channels.$29/monthBilled monthlyChoose Pro150,000 credits a monthAbout 150 min of speech1 seat30 custom voicesVoice Mixer with 3 voicesCommercial licenceInstant voice cloning1 professional clone |
| h3 | Pro |
| p | For audiobooks, podcasts and serious channels. |
| p | $29/month |
| link | Choose Pro → `/signup?plan=pro` |
| li | 150,000 credits a month |
| li | About 150 min of speech |
| li | 30 custom voices |
| li | 1 professional clone |
| li | ProductionFor studios and apps with real volume.$99/monthBilled monthlyChoose Production600,000 credits a monthAbout 600 min of speech2 seats100 custom voicesVoice Mixer with 3 voicesCommercial licenceInstant voice cloning3 professional clones |
| h3 | Production |
| p | For studios and apps with real volume. |
| p | $99/month |
| link | Choose Production → `/signup?plan=production` |
| li | 600,000 credits a month |
| li | About 600 min of speech |
| li | 2 seats |
| li | 100 custom voices |
| li | 3 professional clones |
| li | TeamShared voices and credits for small teams.$299/monthBilled monthlyChoose Team2,000,000 credits a monthAbout 2,000 min of speech5 seats300 custom voicesVoice Mixer with 3 voicesCommercial licenceInstant voice cloning10 professional clones |
| h3 | Team |
| p | Shared voices and credits for small teams. |
| p | $299/month |
| link | Choose Team → `/signup?plan=team` |
| li | 2,000,000 credits a month |
| li | About 2,000 min of speech |
| li | 5 seats |
| li | 300 custom voices |
| li | 10 professional clones |
| li | EnterpriseVolume, security reviews and contracts.Custom Contact salesCustom credits and seatsSSO and audit exportsData processing agreementDedicated support and SLAs |
| h3 | Enterprise |
| p | Volume, security reviews and contracts. |
| p | Custom |
| link | Contact sales → `/contact-sales` |
| li | Custom credits and seats |
| li | SSO and audit exports |
| li | Data processing agreement |
| li | Dedicated support and SLAs |

### 2. What a credit buys

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | What a credit buys |
| p | One plain table instead of a different unit on every page. |
| caption (screen reader only) | Credit cost of each Mimix tool |
| th | Tool |
| th | Credits |
| th | On the Free plan |
| th | Text to Speech and Studio |
| th | Speech to Text |
| th | Dubbing |
| th | Voice Changer |
| th | Voice Isolator |
| th | Sound Effects |
| th | Voice Design |
| th | Voice Mixer |

### 3. Compare plans

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Data table**: Real <table> with a visually hidden <caption> and scope="col" headers. When wider than the screen, it scrolls inside a focusable region (tabindex="0", role="region", labelled by the section heading). Check and dash cells carry visually hidden text ("Included" / "Not included").
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Compare plans |
| caption (screen reader only) | Plan comparison |
| th | Feature |
| th | Free |
| th | Maker |
| th | Pro |
| th | Production |
| th | Team |
| th | Enterprise |
| th | Monthly credits |
| th | Seats |
| th | Custom voices |
| th | Instant voice cloning |
| th | Professional voice clones |
| th | Voice Mixer sources |
| th | Dubbing |
| th | Studio projects |
| th | Commercial licence |
| th | API access |

### 4. API pricing

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background raised (var(--surface)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | API pricing |
| p | The API uses the same credits as the app, so one balance covers both. Production and Team plans add higher rate limits and more concurrent requests. |

### 5. Questions, answered

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **FAQ accordion**: Radix Accordion type="single" collapsible: one panel open at a time; opening another closes the first. Each question is a <button aria-expanded aria-controls> inside a heading (h2 or h3 to fit the outline). Enter/Space toggles; ArrowUp/ArrowDown move between questions; Home/End jump. Panels animate height in 250ms, instantly under reduced motion.
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Questions, answered |
| h3 | What happens to unused credits? |
| button | What happens to unused credits? |
| h3 | Can I switch plans any time? |
| button | Can I switch plans any time? |
| h3 | What if a payment fails? |
| button | What if a payment fails? |
| h3 | Can I buy more credits without upgrading? |
| button | Can I buy more credits without upgrading? |
| h3 | Do prices include tax? |
| button | Do prices include tax? |
| h3 | Which payment methods do you accept? |
| button | Which payment methods do you accept? |

### 6. Not sure which plan fits?

- Element: `<section>`, aria-labelledby; heading h2
- Styling: background page (var(--bg)); vertical padding 96px / 96px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Scroll reveal**: Content is visible by default. When motion is allowed, sections below the fold fade in (opacity 0→1, translateY 16px→0, 400ms var(--ease-enter)) as they enter the viewport. Never armed under prefers-reduced-motion, and always visible when printed.

| Kind | Copy |
|---|---|
| h2 | Not sure which plan fits? |
| p | Start free. You can upgrade the moment you need more, and we’ll prorate the difference. |
| link | Start free → `/signup` |
| link | Contact sales → `/contact-sales` |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
