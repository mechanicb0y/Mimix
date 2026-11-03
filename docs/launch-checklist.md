# Mimix launch checklist (browser only)

This is the order to set Mimix up yourself, in a web browser. Each step says where to click and which
environment variables to fill in. **Never paste a secret key into a chat**, including with Claude.
Keep every secret in your password manager and type it only into the service it belongs to. If you
don't have one, **Bitwarden** is free and works in every browser and on your phone.

You will create two copies of everything:

- **Staging** is for trying changes. It uses Stripe test mode, so no real money moves.
- **Production** is the live site.

Accounts you need: GitHub, Supabase, Stripe, Vercel and Railway. You also need Resend for email.
Sentry (error alerts) and an uptime service are optional but recommended. The voice engine account
(Inworld) comes last.

> This checklist is also a Claude Doc: https://claude.ai/artifact/AAKEnDp4qvo8duXTzrH2fg

> **Making secrets without a terminal.** Wherever a step says *random secret*, use your password
> manager's generator, set to at least 40 characters of letters and digits, and save it as a new entry.
> Each secret appears in two places (for example GitHub and Vercel), so copy it from the password
> manager both times.

---

## 0. Run Mimix on your own computer first

You can run all of Mimix on one Windows or Mac computer, with real Kokoro voices, no accounts and no
administrator password: double-click **Start Mimix**, and the first start sets everything up. The full
steps are in [local-setup.md](local-setup.md) (also sent as a PDF). Do steps 1 (GitHub) and 0 now; the
other steps wait until you want Mimix online. When that time comes, start with free plans where their
terms allow a business; local-setup.md lists which ones do and where Mimix already covers a paid feature.

---

## 1. GitHub: the code

1. Sign in at github.com, click **+** (top right), then **New repository**.
   - Name: `mimix`
   - Visibility: **Private**
   - Leave "Add a README" unticked, then click **Create repository**.
2. Put the project in it. Unzip the latest checkpoint zip on your computer; the code is in its `app` folder. Then use either of these:
   - **GitHub Desktop**, the easiest. Install it from desktop.github.com and sign in. Choose **File, Add local repository**, pick the `app` folder, then **Publish repository**. Untick "Keep this code private" only if you want it public (you don't).
   - **Claude**: in a new chat, connect GitHub (claude.ai, Settings, Connectors). Then ask Claude to push the zip to `mimix`. RESTORE.md explains how.
3. Create a `staging` branch. On the repository page, open the branch menu (it says `main`), type `staging` and click **Create branch: staging from main**.
4. Protect `main`. Go to **Settings, Branches, Add branch ruleset**. Set the target to `main` and tick **Require status checks to pass**. Add the check named **Lint, typecheck, test, build**, then save.
5. Open the **Actions** tab. The **CI** workflow runs on every push, and the first run should turn green within about 15 minutes.

GitHub settings for the workflows (you fill these in after the steps below):

| Where | Name | Value |
|---|---|---|
| Settings, Environments, **New environment** | `staging` and `production` | Create both |
| Each environment, **Environment secrets** | `MIGRATE_DATABASE_URL` | That environment's Supabase session pooler URI (step 2) |
| | `BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `STORAGE_SIGNING_KEY` | The same values as in Vercel for that environment (step 5) |
| | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | That environment's Stripe values (step 3) |
| Each environment, **Environment variables** | `ADMIN_EMAIL` | The Owner's email address, for example `you@your-domain` |
| | `APP_URL` | That environment's site address, for example `https://staging.mimix.example` |
| Settings, Secrets and variables, Actions, **Repository secrets** | `BACKUP_DATABASE_URL` | Production session pooler URI |
| | `BACKUP_PASSPHRASE` | A random secret. Keep it safe: backups can't be opened without it |
| **Repository variables** | `BACKUPS_ENABLED` | `true` (turns on the nightly encrypted backup) |
| | `PRODUCTION_URL` | `https://your-domain` (turns on the 10-minute uptime check) |

---

## 2. Supabase: database and file storage

Do this twice: once for `mimix-staging` and once for `mimix-production`.

1. At supabase.com/dashboard, click **New project**.
   - Name: `mimix-staging` (or `mimix-production`)
   - Database password: a random secret. Save it.
   - Region: the one closest to most of your customers, for example **Southeast Asia (Singapore)**. Use the same region for Vercel in step 5.
2. **Database connection strings.** Click **Connect** (top of the project).
   - **Transaction pooler** (port 6543) gives `DATABASE_URL`. Put your database password in place of `[YOUR-PASSWORD]`.
   - **Session pooler** (port 5432) gives `MIGRATE_DATABASE_URL`. It is the same password, on a different line.
3. **File storage.** Go to **Storage, New bucket**. Name it `mimix-media` and leave **Public bucket** off.
4. **Storage keys.** Go to **Storage, Settings, S3 Connection**.
   - Copy the **Endpoint** into `S3_ENDPOINT` and the **Region** into `S3_REGION`.
   - Click **New access key**. The two values go into `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. The secret is shown once.
5. **Backups.** The Pro plan keeps daily backups for 7 days. Production should be on Pro. Point-in-time recovery is an add-on if you want to restore to any minute.
6. **Tables** are created automatically on each deploy (step 5), or straight away with GitHub **Actions, Setup, Run workflow, task `migrate`**.

---

## 3. Stripe: payments

Start in **test mode**, with the toggle at the top right of dashboard.stripe.com. Staging always stays in test mode, and production switches to live keys at go-live.

1. **Business details.** Go to **Settings, Business**. Set the public business name to Mimix, and add the support email and statement descriptor.
2. **API key.** Go to **Developers, API keys** and reveal the **Secret key** (`sk_test_…`). This is `STRIPE_SECRET_KEY`.
3. **Products and prices.** In GitHub, go to **Actions, Setup, Run workflow**, choose environment `staging` and task `stripe`. It creates the Maker, Pro, Production and Team plans with monthly and annual prices. You can run it again safely.
4. **Webhook.** Go to **Developers, Webhooks, Add endpoint**.
   - URL: `https://<staging address>/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`, `invoice.voided`, `invoice.marked_uncollectible`
   - After saving, reveal the **Signing secret** (`whsec_…`). This is `STRIPE_WEBHOOK_SECRET`.
5. **Customer portal.** Go to **Settings, Billing, Customer portal** and turn on: update payment method, cancel subscription and view invoices. Save.
6. **Tax (optional).** Use **Settings, Tax** if you are registered to collect tax. Then set `STRIPE_AUTOMATIC_TAX=1`.
7. **Test a payment** on staging with card `4242 4242 4242 4242`, any future date and any CVC.

At go-live, switch the toggle to live mode and repeat steps 2 to 5 for production, using the production address.

---

## 4. Railway: background jobs, Voice Mixer and Redis

Vercel can't run long jobs (dubbing, audiobook exports, cloning) or the Voice Mixer's Kokoro server, so these run on Railway. Make one project per environment.

1. At railway.com, click **New Project, Deploy from GitHub repo** and pick `mimix`. Allow access if asked.
2. **Redis.** In the project, click **+ Create, Database, Redis**. Open it, then **Variables**, and copy **`REDIS_PUBLIC_URL`**. Vercel needs it too, so use the public one. This is `REDIS_URL`.
3. **Worker.** This is the service Railway created from the repo.
   - **Settings, Build**: add the variable `RAILWAY_DOCKERFILE_PATH` = `Dockerfile.worker`.
   - **Settings, Source**: set the branch to `main` (or `staging` for the staging project).
   - **Variables**: add the same values as Vercel for this environment (step 5), using **Raw Editor** to paste them in one go. It needs at least `DATABASE_URL`, `REDIS_URL`, the `S3_*` values, `STORAGE_SIGNING_KEY`, `APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `APP_URL`, `EMAIL_*`, `RESEND_API_KEY`, `STRIPE_*`, `VOICE_ENGINE` and its keys, and `SENTRY_DSN`.
   - No public domain is needed.
4. **Voice Mixer (Kokoro).**
   - Click **+ Create, GitHub Repo, mimix** again.
   - **Settings, Source, Root directory**: `engines/kokoro`. It builds from its own Dockerfile.
   - **Variables**: set `MIMIX_MIXER_TOKEN` to a random secret.
   - **Settings, Networking, Generate domain**. That address is `MIXER_ENGINE_URL`, and the token is `MIXER_ENGINE_TOKEN`.
   - It needs about 1 GB of memory and no GPU.

---

## 5. Vercel: the website

1. At vercel.com, click **Add New, Project** and import `mimix` from GitHub. The framework is detected as Next.js. Don't deploy yet.
2. **Settings, Functions, Function region**: choose the same region as Supabase, for example **Singapore (sin1)**.
3. **Settings, Environment Variables.** Add each row below. Use **Production** for the live values, and **Preview** limited to the `staging` branch for the staging values.

| Variable | What to put | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (staging: its address) | Your domain |
| `APP_URL` | Same as `NEXT_PUBLIC_SITE_URL` | |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@your-domain` | |
| `NEXT_PUBLIC_COMPANY_LEGAL_NAME`, `_REG_NO`, `_ADDRESS`, `NEXT_PUBLIC_GOVERNING_LAW`, `NEXT_PUBLIC_COURTS` | From your lawyer | Legal pages show placeholders until set |
| `DATABASE_URL` | Transaction pooler URI | Supabase, step 2 |
| `MIGRATE_DATABASE_URL` | Session pooler URI | Supabase, step 2 |
| `BETTER_AUTH_SECRET` | Random secret | Password manager |
| `APP_ENCRYPTION_KEY` | Random secret | Password manager |
| `STORAGE_SIGNING_KEY` | Random secret | Password manager |
| `ADMIN_EMAIL` | The Owner's email address | |
| `ADMIN_SETUP_TOKEN` | Random secret | Password manager. Used once in step 7 |
| `ADMIN_IP_ALLOWLIST` | Optional: your office IP | |
| `STORAGE_DRIVER` | `s3` | |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket `mimix-media` | Supabase, step 2 |
| `STRIPE_SECRET_KEY` | `sk_test_…` (live: `sk_live_…`) | Stripe, step 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Stripe, step 3 |
| `STRIPE_AUTOMATIC_TAX` | `0` or `1` | Stripe, step 3 |
| `EMAIL_DRIVER` | `resend` | |
| `EMAIL_FROM` | `Mimix <no-reply@your-domain>` | |
| `RESEND_API_KEY` | `re_…` | Resend, step 6 |
| `SAFETY_EMAIL` | Inbox for abuse reports | |
| `QUEUE_DRIVER` | `bullmq` | |
| `REDIS_URL` | Railway `REDIS_PUBLIC_URL` | Railway, step 4 |
| `CRON_SECRET` | Random secret | Password manager. Only for Vercel Cron's 10-minute clean-up; the Railway worker already runs it every 60 seconds, so Vercel Pro isn't needed for it |
| `VOICE_ENGINE` | `mock` until the engine is chosen, then `inworld` | |
| `INWORLD_API_KEY` | From the Inworld portal | When the engine is chosen |
| `MIXER_ENGINE` | `kokoro` | |
| `MIXER_ENGINE_URL`, `MIXER_ENGINE_TOKEN` | Railway Kokoro address and token | Railway, step 4 |
| `MIX_CLONE_TO_MAIN` | `false` until the lawyer clears Inworld's terms | |
| `KOKORO_FEATURES` | With `VOICE_ENGINE=kokoro`: the same list as the Kokoro server, for example `transcribe,isolate,clone` | Railway, step 4 |
| `CLONE_CONSENT` | `recording` (the speaker reads a phrase that must match the samples). `attest` (a ticked confirmation only) is what your own computer uses; don't use it here until the lawyer clears it | Launch gates, below |
| `SPEAKER_VERIFIER` | `neural` when the Kokoro server runs `clone`; otherwise `dsp` (cloning then stays off) | |
| `SPEAKER_MATCH`, `SPEAKER_MATCH_TUNED` | The pass mark from **Tune voice check** on your own recordings (for example `0.73`), and the line it prints | `docs/local-setup.md`, step 6 |
| `GPU_ENGINE`, `GPU_ENGINE_URL`, `GPU_ENGINE_TOKEN`, `GPU_ENGINE_FEATURES` | `off` unless you host a graphics-card server: `voxcpm` or `chatterbox`, its address, its token, and `clone` | Only with a GPU server |
| `TRANSLATOR`, `GOOGLE_TRANSLATE_API_KEY` | `google` and a key, for Dubbing | Google Cloud console |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | The project's DSN | Sentry, step 6 |
| `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `staging` or `production` | |

Leave these **unset** on Vercel: `STRIPE_API_BASE`, `ENABLE_TEST_ROUTES` and `FFMPEG_PATH`. The site refuses to start if test routes are on.

4. Click **Deploy**. Each deploy of `main` (production) or `staging` applies new database migrations first.
5. **Domains**: in **Settings, Domains**, add your domain and follow Vercel's DNS steps. HTTPS is automatic.

---

## 6. Email, error alerts and uptime

- **Resend** (resend.com).
  - Go to **Domains, Add domain**. Add the DNS records it shows at your domain registrar and wait for **Verified**.
  - Go to **API Keys, Create**, with sending access only. Put the key in `RESEND_API_KEY`.
- **Sentry** (sentry.io).
  - Create a project and choose the **Next.js** platform. Copy the **DSN** into `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.
  - Mimix sends no personal data: no names, emails, cookies, request bodies or scripts.
- **Uptime.** Create an HTTP monitor at a service such as UptimeRobot or Better Stack.
  - URL: `https://your-domain/api/health`, checked every 1 minute. Alert by email, plus SMS if you like.
  - The GitHub **Uptime** workflow is a backstop that runs every 10 minutes.
- **Real-visitor speed.** In Vercel, open **Speed Insights** and turn it on to see Core Web Vitals from real visitors.

---

## 7. First sign-in as Owner

1. In GitHub, go to **Actions, Setup, Run workflow**, choose environment `production` and task `admin`.
2. Open `https://your-domain/admin/setup`. Enter your `ADMIN_EMAIL` address, the `ADMIN_SETUP_TOKEN` and a new password. The page works once.
3. Sign in and go to **Settings, Security**. Turn on two-factor sign-in, and save the recovery codes in your password manager.
4. Open `/admin`. Check **System**: the engine, storage, email and consent-check rows should show what you expect.
5. In Vercel, delete `ADMIN_SETUP_TOKEN` (it has been used) and redeploy.

---

## 8. Before you announce it

### What's live on day one

| Tool | Day one | What turns it on |
|---|---|---|
| Text to Speech, Studio | On | Works with any engine. The engine contract (Inworld) gives every language and the best quality; Kokoro (`VOICE_ENGINE=kokoro`) covers 8 languages with no per-character cost; more in `docs/languages.md` |
| Voice Mixer | On | Kokoro server (`MIXER_ENGINE=kokoro`, or Kokoro as the main engine) |
| Speech to Text, Dubbing | On with Inworld, or with Kokoro plus `KOKORO_FEATURES=transcribe`. Dubbing's translation needs `TRANSLATOR=google` | Engine contract, or the Kokoro server's Whisper model |
| Voice Isolator | On with Kokoro plus `KOKORO_FEATURES=isolate` (DeepFilterNet), or VoxCPM2 | Kokoro server with DeepFilterNet |
| Instant voice cloning | On with Kokoro plus `KOKORO_FEATURES=transcribe,clone` and `SPEAKER_VERIFIER=neural` (OpenVoice v2 on the processor), or a graphics-card engine | The Kokoro server's clone models, and the pass mark tuned on real recordings |
| Professional voice cloning | **Off** | Engine contract (Inworld), or VoxCPM2 on a GPU |
| Voice Design | On with Kokoro (three Mixer recipes from a description) | Kokoro server |
| Voice Changer | **Off** | A voice conversion engine (none chosen yet) |
| Sound Effects | **Off** | ElevenLabs SFX licence (OEM terms in the lawyer brief), or Stable Audio 3.0 as the fallback |

The app turns each tool on or off by itself from these settings; the website and the console follow the same switches.

### Launch gates

- [ ] Staging: sign up, verify the email, generate speech, download it, upgrade with the test card, then cancel in the portal.
- [ ] Staging: an Admin adjusts a user's credits in `/admin`, and it appears in the audit log.
- [ ] Production Stripe is on **live** keys, with the live webhook added (step 3).
- [ ] Legal pages show your company details, not placeholders, and the lawyer has signed them off.
- [ ] `MIX_CLONE_TO_MAIN` stays `false` until the lawyer answers the Inworld row in the brief.
- [ ] Voice cloning on the public site uses `CLONE_CONSENT=recording`, unless the lawyer has signed off on consent by confirmation alone (`attest`), with the Voice Cloning Policy and the PDPA (voiceprints) and EU/US points in the lawyer brief. `attest` is for your own computer and trusted testers.
- [ ] Voice cloning: `SPEAKER_VERIFIER=neural` with a pass mark from **Tune voice check** on at least five people's recordings, made on the phones and laptops your customers use. Without the neural check the app keeps cloning off by itself.
- [ ] **A real engine voice for each library voice.** Every library voice that's listed speaks with a chosen voice on the launch engine: on Kokoro, `src/config/kokoro-voices.ts` (9 of 12 mapped today; Noor, Bram and Aisyah are hidden); on Inworld, a chosen Inworld voice for each instead of the two stock fallbacks.
- [ ] Sentry shows a test error. For example, open `/this-page-does-not-exist`: a 404 isn't sent, but any server error is.
- [ ] The uptime monitor is green, and the nightly **Database backup** workflow has run once (check under Actions).
- [ ] Domain, HTTPS and email sending are verified.

### After launch

- **Speed.** Lab LCP of 2.4 to 2.7 s is accepted for launch. Two weeks after launch, check real-visitor LCP at the 75th percentile (Vercel Speed Insights or Search Console). If it is still above 2.5 s, it is the first fix after launch.
