# Changelog

## 0.8.1 · 2026-11-03 · Cloning without the read-aloud check

- **`CLONE_CONSENT`**: `recording` (the default) keeps the read-aloud check; `attest` drops it. With `attest`, whatever you record or upload is cloned as soon as the samples are checked, once you tick "I am the speaker in these recordings, or I have their written permission". The confirmation is kept as the voice's consent record (with the time and IP address) and in the audit log, and voices that were taken down are still refused.
- The launcher writes `CLONE_CONSENT=attest` on your own computer (new and existing `.env.local`). Cloning then no longer needs Speech to Text.
- A voice that was already waiting for its phrase shows **Switch on voice** with the same tick box (`POST /v1/voices/{id}/consent` with `{ "attest": true }`).
- Consent records gain a `method` column (`recording` or `attest`); migration `0010_consent_method.sql`.
- The launcher reads the voice engine's log to tell which extra failed to start (Speech to Text or cloning) and turns off only that one.
- Launch checklist: a public site keeps `CLONE_CONSENT=recording` until the lawyer clears consent by confirmation alone.

## 0.8.0 · 2026-11-03 · Fixes, cloning, design, graphics card and 54 voices

### Fixes
- **Header menus** keep their size and place: each panel has a fixed width, is placed once under its trigger, fades with opacity only, and stays open while the pointer moves from the trigger into it (`DesktopNav.tsx`, `header.spec.ts`).
- **Work keeps running when you change page or close the tab.** Speech, transcription, isolation, the Voice Changer, dubbing, Studio exports, mixes and data exports run as server jobs; each page shows a running job again when you come back. A **Jobs** menu in the app header shows progress, with a message (and an optional desktop notification) when each finishes. Speech uses the new `POST /v1/text-to-speech/async`; `GET /v1/jobs` lists jobs. With `QUEUE_DRIVER=inline`, jobs run apart from the page's request and are picked up again after a restart.
- **The Owner gets every feature and limit** with no Stripe: Plan and billing says "Owner: all features" and shows the plans as a preview. **Staff can give any workspace a plan for free** in the console (optionally until a date), for testers.

### New on your computer
- **Voice cloning** (`KOKORO_FEATURES=clone`): the consent check uses a neural speaker model (3D-Speaker CAM++, Apache-2.0) and Kokoro speaks through OpenVoice v2's voice converter (MIT) on the processor. **Tune voice check** (`Tune voice check.cmd` / `.command`) sets the pass mark from your own recordings.
- **Voice Design** on the processor: a description plus gender, age, accent, pitch, pace and tone become three Mixer recipes to preview; save the one you like.
- **Graphics card**: the launcher reports an NVIDIA card and offers Chatterbox Multilingual (23 languages) or VoxCPM2 (30 languages), which then make clones and read languages Kokoro doesn't (`engines/chatterbox`, `GPU_ENGINE`). Untested: no GPU in Claude's workspace.
- **54 Kokoro voices** in the Voice Library (35 new), with Mandarin and Japanese on.
- `docs/languages.md`: the free routes to about 50 languages (30 on the processor, 46 with VoxCPM2 on a graphics card), with every licence checked, and `docs/language-samples/index.html` with 80 samples checked by Whisper.
- The launcher says in plain words when a step was stopped because the computer ran out of memory.

### Under the hood
- The Kokoro server gains `/v1/speaker` and `/v1/clone`, and recipes carry a cloned voice's timbre (`;tone=`). OpenVoice v2's converter code is vendored in `engines/kokoro/openvoice` (MIT).
- `SPEAKER_VERIFIER=neural`, `SPEAKER_MATCH`, `GPU_ENGINE`, `GPU_ENGINE_URL`, `GPU_ENGINE_TOKEN`, `GPU_ENGINE_FEATURES` in `.env.example` and the launch checklist. An existing `.env.local` gets the cloning lines added on the next start.
- The consent check measures stored samples again when the verifier changes, so voices waiting for consent keep working.

## 0.7.1 · 2026-11-03 · Packaging fix

- The 0.7.0 zip left out `scripts/local/` (the launcher), because the zip's exclude rule for the tools folder `local/` matched every folder named `local`. The zip now excludes only the top-level `local/`, as `.gitignore` does (`/local/`), and is checked for the launcher before it is saved.
- `Start Mimix` and `Stop Mimix` (Windows and Mac) check that their own files are present and show a plain message, instead of a Node.js error, when they aren't.

## 0.7.0 · 2026-11-03 · Run Mimix on your own computer

- **Kokoro as the main engine** (`VOICE_ENGINE=kokoro`): Text to Speech, Studio, the Mixer and Dubbing speak real Kokoro voices on CPU, with no account and no per-character cost. 9 of the 12 library voices are mapped to Kokoro voices (`src/config/kokoro-voices.ts`); the Arabic, German and Malay voices are hidden and refused with a clear message until Kokoro has a voice for them. The text's language sets the pronunciation (English, Spanish, French, Hindi, Italian, Brazilian Portuguese).
- **Speech to Text and Voice Isolator on CPU** (`KOKORO_FEATURES=transcribe,isolate`): faster-whisper (int8) and DeepFilterNet's `deep-filter` program on the Kokoro server.
- **Start Mimix / Stop Mimix** double-click files for Windows and Mac (`scripts/local/mimix-local.mjs`): the first start sets up a private Node.js, Python 3.12 (uv), Kokoro and its models, DeepFilterNet, stripe-mock, `.env.local` with fresh secrets, the database, the Owner account and a production build, all inside `local/`, with no administrator password. Every download is checked against a pinned SHA-256. Sign-up and reset emails are shown in the window.
- `docs/local-setup.md`: the step-by-step guide. Launch checklist: section 0, "What's live on day one", the library-voice launch gate, Bitwarden, the LCP follow-up, and free hosting notes.
- The System page pings the Kokoro server when it is the main engine.
- Kokoro server pins: onnxruntime 1.31.0 (1.23.2 on Intel Macs, which newer releases dropped) and fastapi 0.156.4, both at least two weeks old.

## 0.6.0 · 2026-11-02 · Phase 6: testing, hardening and launch (final checkpoint)

### Voice Mixer v1
- Kokoro-82M mixer server in `engines/kokoro` (FastAPI, CPU, Docker image downloads the model from the kokoro-onnx GitHub release). `MIXER_ENGINE=kokoro` switches the app to it.
- 10 Kokoro English voices seeded as remixable library voices; mixes are stored as recipes and speak on the mixer. Text to Speech, streaming, Studio, dubbing (English) and voice previews route each voice to its own engine.
- The Mixer lists only voices it can blend and says that mixing your own clones comes later. The public playground uses the same voices.
- "Mix, then clone" (`MIX_CLONE_TO_MAIN`): a saved mix is cloned onto the main engine from about 30 s of system-made speech, after a lineage check that no person's voice is involved.

### Security
- Staff act only on accounts with a lower role; two-factor resets on staff accounts need the Owner. Credit and plan changes now go through the same check.
- API writes made with the session cookie are refused from other sites (`403 bad_origin`), on top of SameSite cookies.
- Security headers on every response: Content-Security-Policy, HSTS (two years, preload), nosniff, frame denial, COOP, Referrer-Policy and Permissions-Policy.
- Production refuses test routes and the development Stripe webhook secret.
- OWASP Top 10 review in `docs/security-review.md`.

### Testing
- End-to-end launch flows (`tests/e2e/flows.spec.ts`): sign up, verify, generate and download; upgrade through Stripe Checkout with a signed webhook; clone with consent; mix two voices. The admin credit adjustment is in `admin.spec.ts`.
- Layout sweep (`layout.spec.ts`): every page at 375, 768, 1024, 1440 and 1920 px in both themes, phones and tablets on a touch profile, checking sideways scroll and target sizes, with screenshots.
- Keyboard pass (`keyboard.spec.ts`): Tab and Shift+Tab through every page, checking each control is reached, shows focus and is on screen.

### Fixes from the sweeps
- Touch screens: buttons, segmented controls, slider thumbs, the waveform, checkbox rows and switches are at least 44 px; slider thumbs are 24 px with a mouse.
- Breadcrumbs, legal and blog contents links, table links and console attention links are at least 24 px tall.
- Console tables no longer widen the page on phones.
- Every "Start free" button pointed at `/signup`, which didn't exist; they now go to `/sign-up`, and `/signup`, `/signin` and `/login` redirect. A link-check test (`links.spec.ts`) guards this.
- Mobile Lighthouse performance 75–87 → 90–96 on the main pages: no message catalogue or zod in marketing-page JavaScript, the code font isn't preloaded, hero glows use a mask instead of a blur filter. Accessibility, best practices and SEO 100. Results in `docs/quality-report.md`.
- `/sign-up` is indexed and in the sitemap. zod runs without its eval probe, so the CSP reports no violations.

### Launch
- Sentry for the server and browser (off until a DSN is set, no personal data), `/api/health`, migrations in the Vercel build for production and staging, worker Docker image for Railway, bundled ffmpeg for serverless.
- GitHub Actions: CI (lint, typecheck, unit and integration tests with stripe-mock, build, audit, browser tests), nightly encrypted database backup, 10-minute uptime check, one-off setup tasks (migrate, Owner account, Stripe prices).
- Handover: `docs/architecture.md`, `docs/admin-guide.md`, `docs/runbook.md`, `docs/launch-checklist.md`, `docs/openapi.json` (`npm run openapi`).

## 0.5.0 · 2026-11-02 · Phase 5: admin console (Checkpoint 6)

The staff console at `/admin`, plus the three Checkpoint 5 follow-ups.

### Admin console
- Roles Owner, Admin, Moderator and Support (plus User), with every permission checked on the server for each page and each `/api/admin` call. Non-staff get a plain 404.
- Super-admin: seeded from `ADMIN_EMAIL` with `npm run admin:seed`; the Owner chooses a password once at `/admin/setup` with `ADMIN_SETUP_TOKEN`, then must turn on two-factor before the console opens. Unlimited credits, every tool regardless of flags, 10x product rate limits. Only an Owner can change roles or act on another Owner; nobody acts on themselves; the last Owner can't be demoted.
- Sections: Overview (KPIs, sign-ups and generations per day, queue, what needs attention), Users (search, detail, read-only "view as user", credits, plan, suspend, ban, reset 2FA, role), Voices (reports, library requests, consent records, public-figure blocklist, takedown), Generations (log with filters, abuse reports, flag), Plans and pricing (edit plans with Stripe price sync, coupons as Stripe promotion codes), Flags and banner (per-tool switch by plan or named users, site banner, maintenance mode), Developers (API keys, rate limits, revoke, webhook deliveries), System (engine capabilities, consent-check status, 24-hour failure rate, engine ping, storage, email, templates with test send), Audit log (filters, CSV export with formula-injection guard).
- Security: 15-minute idle lock, password plus 2FA code again before destructive actions (valid 5 minutes), optional `ADMIN_IP_ALLOWLIST`, an email to the staff member on every new console sign-in, a required reason on every change, all of it in the audit log.
- Row-level security switched on for every table (migration 0007) as defense in depth for Supabase.

### Checkpoint 5 follow-ups
- Consent gate: with a real engine, cloning and voice-keeping dubbing stay off until a neural speaker verifier is wired.
- Marketing pages follow the engine flags: "Coming soon" where a tool is off, backup hero line when the Mixer is off.
- Voice Mixer go/no-go samples (Kokoro-82M route) in `mixer-test/` beside the project.

### Quality
- 215 unit and integration tests (11 new for the console); 123 browser tests including an Admin credit adjustment with re-authentication and axe (WCAG 2.2 AA, both themes) on 14 console views.

## 0.4.0 · 2026-11-02 · Phase 4: the app (Checkpoint 5)

The signed-in app, the public API and the platform behind them. Runs and passes its tests with no accounts: every outside service has a local stand-in, switched to the real one by environment variables only.

### Platform
- Better Auth: email and password with breached-password check, verification, reset, change email, Google sign-in (optional), TOTP two-factor with backup codes, session list and sign-out of other devices.
- Workspaces with roles (owner, admin, member, viewer), invites with seat limits, ownership transfer.
- Credits ledger with plan allowances, top-ups and refunds on failure; Stripe Checkout, Customer Portal, plan changes, cancel and resume, invoices (stripe-mock locally).
- Job queue (inline or BullMQ) with progress over SSE, cancellation and retries; worker script; scheduled sweeps through Vercel Cron.
- Private storage with signed media URLs and an optional CDN; ffmpeg audio pipeline; AI-generated label and fingerprint on every output.
- Voice engines: mock, Inworld and a self-hosted VoxCPM2 server (`engines/voxcpm`). Tools an engine can't run are hidden and refused with 501 before charging.
- PWA: offline page and a small service worker (pages network-first, hashed assets cache-first, never API or media).

### Modules
- Text to Speech (with pronunciation rules and streaming), Studio, Dubbing, Sound Effects, Voice Library, My voices, Voice Mixer, Voice Cloning with recorded consent and speaker check, Voice Design, Voice Changer, Speech to Text with speaker labels and captions, Voice Isolator.

### Developers
- API keys with scopes, monthly credit caps and rate limits; usage by product and key; signed webhooks with retries, test sends and delivery log; OpenAPI 3.1 document; code samples.

### Account
- Profile, security, notifications, billing, usage, team, data export (ZIP), account deletion with a 30-day grace period.

### Trust and safety
- Public abuse reports with automatic disabling after 3 distinct "no consent" reports; takedown that cascades to mixes and blocks re-cloning; public "Was this made with Mimix?" check.

### Quality
- 201 unit and integration tests; Playwright flows and axe (WCAG 2.2 AA) on every public and app page in both themes.

## 0.3.0 · Phase 3: marketing website (Checkpoint 4)
## 0.2.0 · Phase 2: icon and logo (Checkpoint 3)
## 0.1.0 · Phase 1: design system (Checkpoint 2)
