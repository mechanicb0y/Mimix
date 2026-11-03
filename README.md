# Mimix

AI voice platform: text to speech, Studio for long-form audio, dubbing, sound effects, voice cloning with recorded consent, voice design from a description, the Voice Mixer, a voice changer, speech to text and a voice isolator. One Next.js project holds the marketing site, the signed-in app (`/app`) and the public API (`/api/v1`).

Everything runs **with no accounts or keys**. Each outside service sits behind an interface with a local stand-in, and the real service is switched on with environment variables only:

| Concern | Local stand-in (default) | Production |
|---|---|---|
| Database | PGlite (Postgres in WASM) on port 5433 | Supabase Postgres (`DATABASE_URL`) |
| Auth | Better Auth on our own tables | same, with a real `BETTER_AUTH_SECRET` (and Google sign-in if wanted) |
| File storage | files in `.data/storage`, signed URLs | Supabase Storage S3 endpoint or R2 (`STORAGE_DRIVER=s3`), optional CDN |
| Billing | stripe-mock | Stripe (leave `STRIPE_API_BASE` empty) |
| Email | JSON files in `.data/outbox` | Resend (`EMAIL_DRIVER=resend`) |
| Jobs | inline, in the web process | BullMQ on Redis plus `npm run worker` |
| Voice engine | mock engine (voice-like sound, no words) | Inworld (`VOICE_ENGINE=inworld`), our VoxCPM2 GPU server (`VOICE_ENGINE=voxcpm`) or our Kokoro CPU server (`VOICE_ENGINE=kokoro`: real voices on one computer, no account) |
| Voice Mixer | mock engine | our Kokoro-82M CPU server (`MIXER_ENGINE=kokoro`, `engines/kokoro`) |
| Error monitoring | console only | Sentry (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) |
| Dubbing translation | mock (tags each line) | Google Cloud Translation v2 |

## Documentation

- **Run Mimix on your own computer, no terminal and no administrator password:** double-click `Start Mimix` (`.cmd` on Windows, `.command` on a Mac). Steps in [docs/local-setup.md](docs/local-setup.md).

- [Architecture](docs/architecture.md): how the parts fit, with a diagram
- [Launch checklist](docs/launch-checklist.md): setting up GitHub, Supabase, Stripe, Railway and Vercel in a browser, with every environment variable
- [Admin guide](docs/admin-guide.md): the staff console, roles and common tasks
- [Runbook](docs/runbook.md): deploys, rollbacks, backups and incidents
- [Security review](docs/security-review.md): OWASP Top 10 review and residual risks
- [Quality report](docs/quality-report.md): Phase 6 test, accessibility and performance results
- [API reference](docs/openapi.json): OpenAPI 3.1, also served at `/api/v1/openapi.json`

## Requirements

- Node.js 22 or newer, npm 10 or newer
- ffmpeg: bundled through `ffmpeg-static`; `FFMPEG_PATH` points at another build
- For billing locally: [stripe-mock](https://github.com/stripe/stripe-mock) (`go install github.com/stripe/stripe-mock@latest`)

## Run it

```bash
npm install
cp .env.example .env.local        # optional: empty values mean "use the default"
npm run db                        # PGlite on 127.0.0.1:5433 (keep it running)
npm run db:migrate                # create the tables
stripe-mock &                     # optional, for billing pages; then set STRIPE_API_BASE=http://localhost:12111
npm run dev                       # http://localhost:3000
```

Sign up at `/sign-up`. The verification email lands in `.data/outbox/` as JSON; open the link inside it.

## Admin console

Staff work at `/admin`. To create the super-admin (Owner):

1. Set `ADMIN_EMAIL` and `ADMIN_SETUP_TOKEN` (at least 32 random characters) in the environment.
2. Run `npm run admin:seed` once. It creates the Owner account without a password.
3. Open `/admin/setup`, enter the email, the token and a new password. The page works once.
4. Sign in, turn on two-factor sign-in under Settings, Security, and open `/admin`.

Roles: Owner (everything, including roles), Admin (runs the platform, can't change roles), Moderator (voices, reports, suspensions), Support (users, credits, 2FA resets, view as user). Promote staff from a user's page in the console (Owners only). The console locks after 15 idle minutes and asks for the password and a 2FA code again before destructive actions. `ADMIN_IP_ALLOWLIST` limits it to listed addresses or IPv4 ranges.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm run db` / `npm run db:migrate` / `npm run db:generate` | Local PGlite server / apply migrations / generate a migration from `src/server/db/schema.ts` |
| `npm run worker` | Job worker (BullMQ) and the 60-second sweeps. `npm run worker -- --once` runs the sweeps once |
| `npm run stripe:setup` | Creates the Stripe products and prices from `src/config/plans.ts` (test or live, by key) |
| `npm run lint` / `npm run typecheck` | ESLint / route types plus `tsc --noEmit` |
| `npm test` | Unit and integration tests (Vitest). Integration tests start their own PGlite; set `STRIPE_MOCK_BIN` to a stripe-mock binary to include billing |
| `npm run test:e2e` | Browser tests (Playwright): builds, starts on port 3200, runs the launch flows, axe (WCAG 2.2 AA, both themes) on every page, the layout sweep, the keyboard pass and a link check. `E2E_BASE_URL` tests a running server instead |
| `npm run specs` | Regenerates `docs/specs/` from a running server |
| `npm run admin:seed` | Creates (or confirms) the Owner account for `ADMIN_EMAIL` |
| `npm run openapi` | Writes `docs/openapi.json` from the route schemas |
| `npm run vercel-build` | What Vercel runs: migrations (production and `staging` only), then `next build` |

## Environment variables

`.env.example` lists every variable with its default and what it is for. `src/server/env.ts` validates them at start-up; in production the app refuses to start with a development secret.

## Voice engines

`src/lib/voice/types.ts` defines the `VoiceEngine` interface. Adapters:

- `mock-engine.ts`: no account; voice-like sound so every flow works offline.
- `inworld-engine.ts`: Inworld TTS-2 (speech, streaming, instant cloning, voice design, speech to text). Built on docs.inworld.ai as read on 2026-11-02 and tested against a stubbed API, not yet against the live one.
- `selfhosted-engine.ts`: our VoxCPM2 server, `engines/voxcpm/` (Python, FastAPI, Docker). Not yet run on a GPU.
- `kokoro-engine.ts`: the Voice Mixer's engine, and with `VOICE_ENGINE=kokoro` the main engine too (library voices speak through `src/config/kokoro-voices.ts`; `KOKORO_FEATURES=transcribe,isolate` adds faster-whisper Speech to Text and DeepFilterNet Voice Isolator on CPU), `engines/kokoro/` (Kokoro-82M, Apache-2.0, runs on CPU). Blends 2–3 of its library voices with pitch and warmth. With `MIX_CLONE_TO_MAIN=true` a saved mix is also cloned onto the main engine (off until the provider's terms are confirmed).

Each engine declares its capabilities. Tools an engine can't run are hidden from the app and refused by the API with `501 engine_unsupported`, before any credits are charged. Neither main engine can blend voices (the Kokoro mixer does that), convert voices, make sound effects or (Inworld) isolate voices, so with a real engine the Voice Mixer, Voice Changer and Sound Effects are hidden until an engine for them is added. Engine-dependent limits live in `src/config/engine-limits.ts` and stay off the site until confirmed.

## Where things live

```
src/
  app/(marketing)/       public pages, including /report and /check-audio
  app/(auth)/            sign-up, sign-in, 2FA, reset, verify, invite
  app/app/               the signed-in app
  app/admin/             the staff console (server-checked roles)
  app/api/admin/         console actions (adminRoute in server/admin/guard.ts)
  app/api/v1/            public API (OpenAPI at /api/v1/openapi.json)
  app/api/cron/sweep     scheduled clean-up (Vercel Cron)
  app/offline            offline page served by public/sw.js
  components/app/        app UI per module, settings, developers, shell
  config/                plans and credit rates, engine limits, voices, navigation
  i18n/messages/en/      every UI string and email
  lib/voice/             VoiceEngine interface and adapters
  lib/schemas/           zod request schemas shared by UI and API
  server/                db (drizzle), auth, api helpers, jobs, storage, email, billing, modules/*
engines/voxcpm/          self-hosted engine server
engines/kokoro/          Voice Mixer server
docs/                    architecture, admin guide, runbook, security review, launch checklist, OpenAPI
.github/workflows/       CI, nightly backup, uptime check, one-off setup tasks
Dockerfile.worker        background worker image (Railway)
scripts/                 db, migrate, worker, stripe setup, specs
tests/unit, tests/integration, tests/e2e
```

## Adding a language

Copy `src/i18n/messages/en` and `src/content/en` to the new locale, translate the values (never the keys) and register the locale in `src/i18n/index.ts`. The `Messages` type makes TypeScript flag any missing string.

## Accessibility

Target is WCAG 2.2 AA. The browser tests run axe on every public page, every app page and every console section in dark and light themes and fail on any violation. Automated checks are not a full audit; a manual audit is due before launch.
