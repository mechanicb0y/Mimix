# Acceptable Use Policy

Route `/legal/acceptable-use` · HTTP 200 · one H1: yes · copy source: `src/content/en/legal.ts`

## SEO

| Tag | Value |
|---|---|
| Title (29/60) | Acceptable Use Policy \| Mimix |
| Description (144/155) | What you can and can’t do with Mimix: no impersonation without consent, fraud, harassment or deceptive political content, and how we enforce it. |
| Canonical | http://localhost:3000/legal/acceptable-use |
| Robots | index, follow (default) |
| og:title / og:type | Acceptable Use Policy \| Mimix / website |
| og:description | What you can and can’t do with Mimix: no impersonation without consent, fraud, harassment or deceptive political content, and how we enforce it. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · nav · footer · nav "Footer"

Heading outline:

- h1 Acceptable Use Policy
  - h2 Contents
  - h2 Other policies
  - h2 1. Not allowed
  - h2 2. Be open about AI audio
  - h2 3. Reporting misuse
  - h2 4. Enforcement

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Acceptable Use Policy

- Element: `<article>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| h1 | Acceptable Use Policy |
| p | Last updated 2 November 2026 |
| p | This policy is awaiting legal review and may change before Mimix launches. Text in square brackets is a placeholder for company details. |
| h2 | Contents |
| link | 1. Not allowed → `#not-allowed` |
| link | 2. Be open about AI audio → `#disclosure` |
| link | 3. Reporting misuse → `#reporting` |
| link | 4. Enforcement → `#enforcement` |
| h2 | Other policies |
| link | Terms of Service → `/legal/terms` |
| link | Privacy Policy → `/legal/privacy` |
| link | Voice Cloning Policy → `/legal/voice-cloning-policy` |
| p | Mimix is for creating, not deceiving. This policy lists what isn’t allowed on the service. It applies to everything you upload, generate or share. |
| h2 | 1. Not allowed |
| p | You must not use Mimix to: |
| li | Impersonate a real person without their documented consent |
| li | Commit or help commit fraud, scams or identity theft, including voice phishing |
| li | Harass, threaten, bully or intimidate anyone |
| li | Create deceptive political content, including fake statements by candidates or officials, or content meant to mislead voters |
| li | Create sexual content involving real people without consent, or any content sexualising minors |
| li | Promote violence, terrorism or hatred against protected groups |
| li | Break the law or infringe others’ intellectual property |
| li | Get around our safety systems, rate limits or consent checks |
| h2 | 2. Be open about AI audio |
| p | Where people could reasonably believe they’re hearing a real person, tell them the audio is AI-generated. Some platforms and countries require this. |
| h2 | 3. Reporting misuse |
| p | Use the report button on any voice or shared clip, or email us. Reports go to our moderation team, and we tell voice owners when we take something down. |
| h2 | 4. Enforcement |
| p | Depending on the seriousness, we may remove content, disable voices, suspend features, close accounts and, where required, inform the authorities. Serious violations can lead to immediate closure without a refund. |
| p | Questions about this policy? Email support@example.com. |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
