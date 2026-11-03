# Mimix runbook

What to do when something needs fixing in production. Set-up from scratch is in [launch-checklist.md](launch-checklist.md); how the parts fit is in [architecture.md](architecture.md).

## Where to look first

| Signal | Where |
|---|---|
| Site up? | `https://<your domain>/api/health` returns `{"ok":true}` with 200, or 503 when the database doesn't answer. The **Uptime check** workflow in GitHub runs it every 10 minutes and fails (emailing you) when it doesn't |
| Errors | Sentry, project "mimix" (web and worker) |
| Web logs | Vercel, Project, Logs (filter by `/api/`) |
| Job logs | Railway, the worker service, Logs |
| Engine health | Console, **System**: health check and 24-hour failure rate |
| Payments | Stripe, Developers, Webhooks: failed deliveries to `/api/webhooks/stripe` |

## Deploy

- **Staging:** push or merge to `staging`. Vercel builds it and runs migrations against the staging database (`vercel-build`).
- **Production:** merge to `main` after CI is green. Vercel builds it, runs migrations against production, then switches traffic.
- **Worker:** Railway rebuilds the worker from `Dockerfile.worker` on each push to `main`. Deploy the web app first when a change adds a column the worker reads.

## Roll back

1. Vercel, Deployments, pick the last good one, **Promote to Production** (Instant Rollback). Takes seconds.
2. Railway, the worker service, Deployments, **Redeploy** the last good one.
3. Migrations aren't rolled back automatically. Our migrations only add (new tables and nullable columns), so the previous version runs on the newer schema. If a migration must be undone, write a new migration that reverses it and deploy that.

## Maintenance mode

Console, **Flags and banner**, **Turn on maintenance mode**. The app and the API close to everyone except staff; the website stays up and shows the message. Use it for risky migrations or while an incident is being fixed. Turn it off from the same place.

## Restore a backup

There are two copies:

- **Supabase daily backups** (Database, Backups). Pro plan keeps 7 days; point-in-time recovery is an add-on. To restore: Database, Backups, pick a day, **Restore**. This replaces the whole database, so turn on maintenance mode first.
- **Our nightly encrypted dump** (GitHub, Actions, **Database backup**, a run, Artifacts), kept 30 days. Use it to restore into a new project, or to recover single rows:

```bash
# On a computer with the PostgreSQL 17 client and gpg
gpg --decrypt mimix-YYYYMMDDTHHMMZ.dump.gpg > mimix.dump          # asks for BACKUP_PASSPHRASE
pg_restore --list mimix.dump | head                                  # check it's readable
# Into an empty database (a new Supabase project or a local Postgres):
pg_restore --no-owner --no-privileges --dbname "$TARGET_DATABASE_URL" mimix.dump
```

Restore into a fresh project first and check it (users count, latest generations) before pointing `DATABASE_URL` at it. Audio files live in Storage and are not in the dump; Supabase Storage is not covered by database backups, so turn on bucket versioning or a storage copy if you need file recovery.

**Test the restore once a quarter**: restore last night's dump into a scratch project and sign in.

## Incidents

### The voice engine fails
Symptoms: the System page's failure rate rises, customers see "The voice engine couldn’t finish this. No credits were charged." Failed generations and jobs are refunded automatically.
1. Check the provider's status page (Inworld) or the GPU server's logs (VoxCPM).
2. If it will take a while, show a **Site banner** saying generation is slow or paused.
3. To switch engines, change `VOICE_ENGINE` in Vercel and Railway and redeploy. Voices made on one engine don't move to another; the app hides those it can't use.

### The Voice Mixer fails
The Kokoro server on Railway (`MIXER_ENGINE_URL`). Check its logs and `GET /v1/health` with `MIXER_ENGINE_TOKEN`. Restart the service. Give it at least 1 GB of memory (the model is about 330 MB plus the ONNX runtime); the first request after a restart takes a few seconds while the model loads.

### Jobs are stuck ("Processing" for a long time)
1. Railway: is the worker running? Restart it. Jobs are retried; a job that keeps failing is marked failed and its credits refunded.
2. Railway: is Redis up and not out of memory?
3. Console, **System** and **Overview** show the job queue (waiting and failed).

### Payments don't update plans
1. Stripe, Developers, Webhooks: are deliveries failing? The response body says why.
2. A 400 "bad signature" means `STRIPE_WEBHOOK_SECRET` in Vercel doesn't match the endpoint's signing secret. Copy it again (Reveal), save, redeploy, then **Resend** the failed events in Stripe.
3. Fix a single customer by hand with **Change plan** in the console.

### Email isn't arriving
Resend, Logs. Check the domain is still verified (DNS records). Sign-up links can be re-sent from the sign-in page.

### A secret leaked
Rotate it at the provider, update the value in Vercel (and Railway if listed there), redeploy.
- `BETTER_AUTH_SECRET`: rotating it signs everyone out.
- `APP_ENCRYPTION_KEY`: don't rotate it without re-encrypting what it protects (stored secrets such as webhook signing secrets).
- A customer's API key: console, **Developers**, **Revoke**, and tell the customer.

### Abuse (a reported clone of a real person)
Console, Voices, **Reported**. Take the voice down (it stops working at once), review mixes built from it, and suspend the account if needed. Add the name to the **Public-figure blocklist** if it's a public figure. Everything is in the audit log for any later request from the person or the authorities.

### The site is slow
Vercel, Observability (function duration) and Speed Insights. Supabase, Reports (slow queries). Most pages are static; slow app pages usually mean a slow database query or an engine call.

## Routine

| When | What |
|---|---|
| Daily | Glance at Sentry and the uptime workflow |
| Weekly | Console Overview: open reports, staff without two-factor, failed jobs |
| Monthly | `npm audit` in CI output; update dependencies on a branch and let CI test them |
| Two weeks after launch | Real-visitor LCP at the 75th percentile (Speed Insights or Search Console). Above 2.5 s: make it the first fix after launch (LEPL, 2026-11-03) |
| Quarterly | Test a backup restore; review staff roles; rotate `ADMIN_SETUP_TOKEN` (unused after set-up) |
