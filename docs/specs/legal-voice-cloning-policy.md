# Voice Cloning Policy

Route `/legal/voice-cloning-policy` · HTTP 200 · one H1: yes · copy source: `src/content/en/legal.ts`

## SEO

| Tag | Value |
|---|---|
| Title (52/60) | Voice Cloning Policy: consent and safeguards \| Mimix |
| Description (145/155) | How Mimix verifies consent for every voice clone, blocks public figures, tracks mixed-voice lineage, marks generated audio and handles takedowns. |
| Canonical | http://localhost:3000/legal/voice-cloning-policy |
| Robots | index, follow (default) |
| og:title / og:type | Voice Cloning Policy: consent and safeguards \| Mimix / website |
| og:description | How Mimix verifies consent for every voice clone, blocks public figures, tracks mixed-voice lineage, marks generated audio and handles takedowns. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · nav · footer · nav "Footer"

Heading outline:

- h1 Voice Cloning Policy
  - h2 Contents
  - h2 Other policies
  - h2 1. Consent for every clone
  - h2 2. Public figures
  - h2 3. Mixing and lineage
  - h2 4. Provenance
  - h2 5. Reports and takedowns
  - h2 6. Deleting your voice

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Voice Cloning Policy

- Element: `<article>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| h1 | Voice Cloning Policy |
| p | Last updated 2 November 2026 |
| p | This policy is awaiting legal review and may change before Mimix launches. Text in square brackets is a placeholder for company details. |
| h2 | Contents |
| link | 1. Consent for every clone → `#consent` |
| link | 2. Public figures → `#blocklist` |
| link | 3. Mixing and lineage → `#mixing` |
| link | 4. Provenance → `#provenance` |
| link | 5. Reports and takedowns → `#takedowns` |
| link | 6. Deleting your voice → `#deletion` |
| h2 | Other policies |
| link | Terms of Service → `/legal/terms` |
| link | Privacy Policy → `/legal/privacy` |
| link | Acceptable Use Policy → `/legal/acceptable-use` |
| p | Real voices belong to real people. This policy explains the safeguards that apply to every cloned and mixed voice on Mimix. |
| h2 | 1. Consent for every clone |
| p | Every clone, instant or professional, needs the speaker to read a randomly generated phrase out loud. We compare that recording with the uploaded samples, and the voice only switches on if they match. |
| p | We store a consent record with the user, the time, the phrase and a fingerprint (hash) of the verification audio. |
| h2 | 2. Public figures |
| p | A blocklist stops cloning or mixing the voices of well-known public figures, such as politicians and celebrities, even when verification appears to pass. |
| h2 | 3. Mixing and lineage |
| p | You can mix only voices you own or that are licensed for remixing. Every mix records its sources and their weights, and inherits the most restrictive licence among them. |
| p | If a source voice is taken down, every mix built from it is disabled, and the owners of those mixes are notified. |
| h2 | 4. Provenance |
| p | Where the voice engine supports it, generated audio carries a watermark or signed provenance data. Our public checker lets anyone test whether a clip was made with Mimix. |
| h2 | 5. Reports and takedowns |
| p | Anyone can report a voice they believe was cloned without consent. We review reports promptly, may disable the voice while we investigate, and notify the voice owner of the outcome. |
| h2 | 6. Deleting your voice |
| p | You can permanently delete any voice you own and its samples at any time. Mixes built from it stop working. Consent records are kept only as long as the law requires. |
| p | Questions about this policy? Email support@example.com. |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
