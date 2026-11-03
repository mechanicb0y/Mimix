# Let’s talk about your project

Route `/contact-sales` · HTTP 200 · one H1: yes · copy source: `src/i18n/messages/en/*`

## SEO

| Tag | Value |
|---|---|
| Title (52/60) | Contact sales: volume pricing and enterprise \| Mimix |
| Description (147/155) | Talk to the Mimix team about volume credits, SSO, security reviews, custom contracts and managed dubbing. We usually reply within one business day. |
| Canonical | http://localhost:3000/contact-sales |
| Robots | index, follow (default) |
| og:title / og:type | Contact sales: volume pricing and enterprise \| Mimix / website |
| og:description | Talk to the Mimix team about volume credits, SSO, security reviews, custom contracts and managed dubbing. We usually reply within one business day. |
| og:image | http://localhost:3000/og/mimix-og.png (1200×630) alt: The Mimix logo: two soft lines meet and continue as one wave, on deep teal. |
| twitter:card | summary_large_image |
| JSON-LD | ContactPage |

## Structure

Landmarks: header · nav "Main" · main · footer · nav "Footer"

Heading outline:

- h1 Let’s talk about your project
  - h2 Tell us about your needs

Header, mega-menu, mobile drawer and footer are shared on every page: see [README.md](README.md#site-chrome).

## Sections

### 1. Let’s talk about your project

- Element: `<section>`, aria-labelledby; heading h1
- Styling: background page (var(--bg)); vertical padding 80px / 64px (64px / 96px at md and up for standard sections); content in `.container-content` (max-width 1200px, gutter 16/24/32px)
- Components and behavior:
  - **Form with inline validation**: noValidate form: fields validate on blur and on submit with the same zod schema the server uses. Errors sit under each field, linked by aria-describedby, with aria-invalid on the field. On submit errors, an error summary (role="alert", tabindex="-1") takes focus and links to each field (Contact sales). Newsletter moves focus back to the email field. Submitting disables the button and sets aria-busy; success and server errors are announced through role="status". Contact sales has a hidden honeypot field; the APIs check same origin, rate limit (newsletter 5 a minute, contact 5 per 10 minutes per client) and validate again.

| Kind | Copy |
|---|---|
| p | Contact sales |
| h1 | Let’s talk about your project |
| p | Tell us what you’re building and we’ll usually reply within one business day with options and pricing. |
| li | Volume credits and custom seats |
| li | SSO, audit exports and role controls |
| li | Data processing agreement and security reviews |
| li | Managed dubbing for large catalogues |
| h2 | Tell us about your needs |
| label | Full name (Required) |
| label | Work email (Required) |
| label | Company (Required) |
| label | Team size (Required) |
| option | Choose a size |
| option | 1 to 10 |
| option | 11 to 50 |
| option | 51 to 200 |
| option | 201 to 1,000 |
| option | More than 1,000 |
| label | What will you use Mimix for? (Required) |
| label | Estimated monthly audio (optional) |
| label | Website |
| label | I agree to Mimix contacting me about this request. |
| button | Send message |

## Images and alt text

No content images. Icons are decorative (aria-hidden="true") and every icon-only control has an aria-label.
