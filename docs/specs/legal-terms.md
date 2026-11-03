# Terms of Service

Route `/legal/terms` · HTTP 200 · one H1: yes · copy source: `src/content/en/legal.ts`

## SEO

| Tag | Value |
|---|---|
| Title (24/60) | Terms of Service \| Mimix |
| Description (145/155) | The agreement between you and Mimix when you use our website, apps and API: accounts, plans and credits, your content, our service and liability. |
| Canonical | http://localhost:3000/legal/terms |
| Robots | index, follow (default) |
| og:title / og:type | Terms of Service \| Mimix / website |
| og:description | The agreement between you and Mimix when you use our website, apps and API: accounts, plans and credits, your content, our service and liability. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | WebPage, BreadcrumbList |

## Structure

Landmarks: header · nav "Main" · main · nav "Breadcrumb" · nav · footer · nav "Footer"

Heading outline:

- h1 Terms of Service
  - h2 Contents
  - h2 Other policies
  - h2 1. Your account
  - h2 2. Plans, credits and payment
  - h2 3. Your content
  - h2 4. Using generated audio
  - h2 5. Rules
  - h2 6. API use
  - h2 7. Availability and changes
  - h2 8. Liability
  - h2 9. Ending the agreement
  - h2 10. Changes to these terms
  - h2 11. Governing law and disputes
  - h2 12. Who we are

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Terms of Service

- Element: `<article>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 64px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Breadcrumbs**: <nav aria-label="Breadcrumb"> with an ordered list; the current page has aria-current="page". Mirrored in BreadcrumbList JSON-LD.

| Kind | Copy |
|---|---|
| link | Home → `/` |
| h1 | Terms of Service |
| p | Last updated 2 November 2026 |
| p | This policy is awaiting legal review and may change before Mimix launches. Text in square brackets is a placeholder for company details. |
| h2 | Contents |
| link | 1. Your account → `#accounts` |
| link | 2. Plans, credits and payment → `#plans` |
| link | 3. Your content → `#your-content` |
| link | 4. Using generated audio → `#licence` |
| link | 5. Rules → `#rules` |
| link | 6. API use → `#api` |
| link | 7. Availability and changes → `#availability` |
| link | 8. Liability → `#liability` |
| link | 9. Ending the agreement → `#ending` |
| link | 10. Changes to these terms → `#changes` |
| link | 11. Governing law and disputes → `#governing-law` |
| link | 12. Who we are → `#who-we-are` |
| h2 | Other policies |
| link | Privacy Policy → `/legal/privacy` |
| link | Acceptable Use Policy → `/legal/acceptable-use` |
| link | Voice Cloning Policy → `/legal/voice-cloning-policy` |
| p | These terms are the agreement between you and [Company legal name] (“Mimix”, “we”) when you use our website, apps and API (together, the “service”). By creating an account or using the service, you agree to them. |
| h2 | 1. Your account |
| p | You must be at least 18, or the age of majority where you live, to create an account. Keep your login details safe and turn on two-factor authentication. You’re responsible for activity on your account. |
| p | If you use Mimix for an organisation, you confirm you can accept these terms on its behalf. |
| h2 | 2. Plans, credits and payment |
| p | Paid plans renew automatically each month or year until you cancel. Monthly credits reset at the start of each billing period and don’t roll over. Top-up credits stay available while your plan is active. |
| p | Upgrades take effect immediately and are prorated. Downgrades and cancellations take effect at the end of the current period. Prices exclude taxes, which we add at checkout where required. |
| p | If a generation fails because of a problem on our side, we return the credits it used. |
| h2 | 3. Your content |
| p | You keep ownership of the text, audio and voices you upload, and of the audio you generate, subject to the licence of any voices you use. |
| p | You give Mimix permission to store and process your content only as needed to run the service for you. We don’t use your content to train models unless you opt in. |
| h2 | 4. Using generated audio |
| p | On paid plans, you may use generated audio commercially. On the Free plan, generated audio is for personal, non-commercial use. |
| p | Audio made with a library voice follows that voice’s licence. A mixed voice follows the most restrictive licence among its sources. |
| h2 | 5. Rules |
| p | You must follow our Acceptable Use Policy and Voice Cloning Policy. We may suspend or close accounts that break them, and remove content that does. |
| h2 | 6. API use |
| p | Keep API keys secret and on your servers. You’re responsible for requests made with your keys. We may apply rate limits to keep the service reliable for everyone. |
| h2 | 7. Availability and changes |
| p | We work hard to keep Mimix available, but we can’t promise it will never be interrupted. We may change or retire features; if a change removes something you pay for, we’ll tell you in advance. |
| h2 | 8. Liability |
| p | To the extent the law allows, Mimix isn’t liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits liability that can’t be limited by law. |
| h2 | 9. Ending the agreement |
| p | You can close your account at any time from Settings. We may end these terms if you seriously or repeatedly break them. You can export your data before your account closes. |
| h2 | 10. Changes to these terms |
| p | If we make material changes, we’ll email you at least 30 days before they apply. Continuing to use Mimix after that means you accept the new terms. |
| h2 | 11. Governing law and disputes |
| p | These terms are governed by the laws of [Governing law, likely Malaysia]. Disputes go to the courts of [Courts with jurisdiction], unless the law where you live gives you the right to bring a claim in your local courts. |
| h2 | 12. Who we are |
| p | Mimix is operated by [Company legal name], registration number [Company registration number], [Registered address]. |
| p | Questions about this policy? Email support@example.com. |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
