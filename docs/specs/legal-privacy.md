# Privacy Policy

Route `/legal/privacy` · HTTP 200 · one H1: yes · copy source: `src/content/en/legal.ts`

## SEO

| Tag | Value |
|---|---|
| Title (22/60) | Privacy Policy \| Mimix |
| Description (128/155) | What personal data Mimix collects, why, how long we keep it, who we share it with and how to access, export or delete your data. |
| Canonical | http://localhost:3000/legal/privacy |
| Robots | index, follow (default) |
| og:title / og:type | Privacy Policy \| Mimix / website |
| og:description | What personal data Mimix collects, why, how long we keep it, who we share it with and how to access, export or delete your data. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · nav · footer · nav "Footer"

Heading outline:

- h1 Privacy Policy
  - h2 Contents
  - h2 Other policies
  - h2 1. What we collect
  - h2 2. Why we use it
  - h2 3. Voice data
  - h2 4. How long we keep data
  - h2 5. Who we share it with
  - h2 6. Your rights
  - h2 7. Security
  - h2 8. Cookies
  - h2 9. Contact

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Privacy Policy

- Element: `<article>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| h1 | Privacy Policy |
| p | Last updated 2 November 2026 |
| p | This policy is awaiting legal review and may change before Mimix launches. Text in square brackets is a placeholder for company details. |
| h2 | Contents |
| link | 1. What we collect → `#what` |
| link | 2. Why we use it → `#why` |
| link | 3. Voice data → `#voice-data` |
| link | 4. How long we keep data → `#retention` |
| link | 5. Who we share it with → `#sharing` |
| link | 6. Your rights → `#rights` |
| link | 7. Security → `#security` |
| link | 8. Cookies → `#cookies` |
| link | 9. Contact → `#contact` |
| h2 | Other policies |
| link | Terms of Service → `/legal/terms` |
| link | Acceptable Use Policy → `/legal/acceptable-use` |
| link | Voice Cloning Policy → `/legal/voice-cloning-policy` |
| p | This policy explains what personal data Mimix collects, why we collect it, and the choices you have. We collect as little as we can and keep it only as long as we need it. |
| h2 | 1. What we collect |
| p | We collect the information you give us and the information the service needs to work: |
| li | Account details: name, email, password hash and two-factor settings |
| li | Billing details: handled by our payment provider; we store only the last four digits and expiry of your card |
| li | Your content: text, uploaded audio, voice samples, generated audio and transcripts |
| li | Consent records for cloned voices: time, verification phrase and an audio fingerprint |
| li | Usage data: features used, credits spent, device type and approximate location from your IP address |
| h2 | 2. Why we use it |
| p | To provide and secure the service, process payments, prevent abuse, answer support requests and, if you agree, send product news. We don’t sell personal data. |
| h2 | 3. Voice data |
| p | Voice samples are used only to create and run the voice you asked for. We don’t use them to train shared models unless you opt in. You can delete a voice and its samples permanently at any time. |
| h2 | 4. How long we keep data |
| p | We keep data for as long as your account is open, with these exceptions: |
| li | Generated audio in your history: until you delete it, or 30 days after your account closes |
| li | Voice samples: until you delete the voice, or 30 days after your account closes |
| li | Consent records: for as long as the voice exists, then as long as the law requires |
| li | Billing records: as long as tax law requires |
| li | Server logs: 30 days |
| h2 | 5. Who we share it with |
| p | Service providers who help us run Mimix, such as hosting, payments, email and error monitoring, under contracts that limit how they use your data. We may disclose data if the law requires it, or to protect people from harm. |
| h2 | 6. Your rights |
| p | You can access, correct, export or delete your data from Settings, or by emailing us. Depending on where you live, you may have more rights, such as objecting to processing or complaining to a regulator. |
| h2 | 7. Security |
| p | We encrypt data in transit and at rest, keep audio in private storage behind short-lived links, and limit staff access to what their job needs. |
| h2 | 8. Cookies |
| p | We use essential cookies to keep you signed in and remember settings such as your theme. We use privacy-friendly analytics that don’t track you across other sites. |
| h2 | 9. Contact |
| p | The controller of your personal data is [Company legal name] (registration number [Company registration number]), [Registered address]. |
| p | Questions or requests about your data? Email us and we’ll reply within 30 days. |
| p | Questions about this policy? Email support@example.com. |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
