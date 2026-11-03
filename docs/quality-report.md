# Mimix quality report (Phase 6, 2026-11-02)

What was tested before launch, how, and the result. Every check here runs again with `npm test` and `npm run test:e2e`, and in CI.

## Tests

| Suite | Count | Result |
|---|---|---|
| Unit and integration (Vitest, real Postgres in PGlite, stripe-mock) | 237 | 236 pass, 1 skipped (the live Kokoro check, which needs `KOKORO_LIVE_URL`) |
| Browser (Playwright, production build) | 133 | All pass |

The browser suite includes:

- **Launch flows** (`flows.spec.ts`, `admin.spec.ts`): sign up, confirm the email, generate speech and download it; upgrade to Pro through Stripe Checkout with a signed webhook (Stripe test mode, played by stripe-mock); clone a voice with recorded consent; mix two voices and save the mix; an Admin adjusts a user's credits and it shows in the audit log.
- **Accessibility** (`pages.spec.ts`, `app.spec.ts`, `admin.spec.ts`): axe (WCAG 2.2 AA rules) on every public page, every app page and every console section, in light and dark themes. Zero violations of any severity.
- **Layout sweep** (`layout.spec.ts`): every page at 375, 768, 1024, 1440 and 1920 px, phones and tablets on a touch device profile. No page scrolls sideways; every control is at least 24 × 24 px, and buttons, fields and menu items are at least 44 px tall on touch screens. Inline links inside sentences are exempt, as WCAG 2.5.8 allows. Screenshots of both themes: https://claude.ai/artifact/F8PNCqE6gQ3PMLaffqczfj
- **Keyboard pass** (`keyboard.spec.ts`): on every page, Tab from the top to the end. Every control is reached, nothing traps focus, every focused control shows a visible focus ring, and nothing is focused under the sticky header. Shift+Tab walks back.
- **Links** (`links.spec.ts`): every same-site link on the public pages answers below 400.
- **Interactions** (`interactions.spec.ts`, `header.spec.ts`, `mobile.spec.ts`): menus with arrow keys and Esc, skip link, players, sliders by keyboard, forms with inline errors, reduced motion.

### Fixed during Phase 6

- All "Start free" buttons on the marketing site went to `/signup`, which doesn't exist. They now go to `/sign-up`, and `/signup`, `/signin` and `/login` redirect.
- Console tables made the page scroll sideways on phones.
- Small targets: breadcrumbs, legal and blog contents links, table links, slider thumbs (22 px), segmented controls, switches, the waveform and checkbox rows on touch screens.
- zod's eval probe was reported as a Content-Security-Policy violation on the sign-up page.

## Performance (Lighthouse 13.5, mobile, simulated slow 4G and 4× CPU)

Median of three runs against a local production build.

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Home `/` | 90 | 100 | 100 | 100 | 2.6 s | 315 ms | 0 |
| Pricing | 90 | 100 | 100 | 100 | 2.5 s | 355 ms | 0 |
| Voice Mixer | 92 | 100 | 100 | 100 | 2.6 s | 241 ms | 0 |
| Sign up | 92 | 100 | 100 | 100 | 2.7 s | 240 ms | 0 |
| Text to Speech product page | 96 | 100 | 100 | 100 | 2.6 s | 124 ms | 0 |
| Blog post | 92 | 100 | 100 | 100 | 2.4 s | 285 ms | 0 |
| Developers | 96 | 100 | 100 | 100 | 2.6 s | 159 ms | 0 |

Before the Phase 6 changes the home page scored 75–82 with 3.1–3.6 s LCP. What changed: client components no longer pull the whole message catalogue into the browser (about 48 KB compressed), the footer email check no longer loads zod (32 KB), the code font is not preloaded, and the hero glows use a mask instead of a costly blur filter. Page JavaScript on the home page went from 255 KB to 206–219 KB compressed, most of which is React and Next.js itself.

**About the Core Web Vitals targets.** Lab LCP is 2.4–2.7 s under Lighthouse's simulated slow phone, close to the 2.5 s target; CLS is 0 everywhere. INP can only be measured with real visitors; the lab stand-in (Total Blocking Time) is 124–355 ms. The scores varied by up to 8 points between runs on this shared machine. After launch, check real-visitor numbers in Vercel Speed Insights (Project, Speed Insights, turn on) and in Search Console's Core Web Vitals report, and treat those as the measure.

Signed-in pages are not scored by Lighthouse here (they aren't crawled); they share the same shell and are covered by the accessibility, layout and keyboard checks above.

## Version 0.7.0: Mimix on one computer (2026-11-03)

- `tests/integration/kokoro-main.test.ts`: Kokoro as the main engine against a stub server: library voices speak through their Kokoro voice, the text's language is passed on, unmapped voices are hidden and refused with a clear message before any charge, mixes of library and Kokoro voices, Speech to Text and the Voice Isolator.
- `tests/integration/kokoro-live.test.ts` (opt-in) against the real Kokoro server: passed. English and Spanish library voices, and the Voice Isolator keeps the clip's length.
- Kokoro server checked by hand: English (UK), Spanish, French, Hindi, Italian and Brazilian Portuguese voices each spoke their sentence in 0.5 to 1.9 s on CPU; a Japanese voice is refused. Voice Isolator: a noisy clip went from 7.4 dB to 15.2 dB signal-to-noise in 1.7 s.
- The launcher (`Start Mimix.command`, run on Linux from a clean copy of the project): the first start completed every step and opened the app; the Owner set up the account at `/admin/setup`, generated speech with Wren, Elio and Hollis, and previewed a mix; Noor was refused; a sign-up email's link was shown in the window; Stop stopped every process; the second start took 9 seconds. Speech to Text turned itself off because Hugging Face is blocked in this workspace, as designed.
- Not tested: the Windows `.cmd` and Mac `.command` files on those systems, the Whisper model download, and Intel Macs.

## Security

See [security-review.md](security-review.md): OWASP Top 10 (2025) review, headers, validation, uploads, secrets, dependency audit and role tests. No open high or critical findings.

## Not covered

- A manual accessibility audit with screen reader users (NVDA, VoiceOver, TalkBack). Automated checks find roughly a third to a half of real issues.
- Real services: Inworld, VoxCPM2 on a GPU, Supabase, live Stripe, Resend. Each is behind an interface tested with a stand-in.
- Load testing. Rate limits and the job queue are in place; a load test belongs on staging once it runs on real services.
