# Mimix security review (Phase 6, 2026-11-02)

A code review against the OWASP Top 10 (2025 edition), done by reading the code and running the tests named below. It is not a penetration test. A paid external test is recommended before the first enterprise customer.

**Result:** no open high or critical findings. One fix was made during the review (cross-site writes, A01). Residual risks are listed at the end.

## A01 Broken access control

- Every `/api/v1` route calls `apiAuth` with a permission; workspace roles are checked on the server (`src/server/workspaces.ts`), API keys by scope (`missing_scope`). Every query is filtered by the caller's workspace id. Tests: `tests/integration/developers.test.ts`, `voices.test.ts`, `account.test.ts`.
- The console checks staff role, two-factor, idle lock and the section permission on every page and every `/api/admin` call; non-staff get 404. Staff act only on lower roles, and two-factor resets on staff need an Owner (`outranks`, `protectTarget`). Tests: `tests/integration/admin.test.ts` (role-rank cases for Support, Moderator, Admin and Owner), `tests/e2e/admin.spec.ts`.
- **Fixed in this review:** API writes made with the session cookie are now refused (`403 bad_origin`) when the `Origin` header is another site or `Sec-Fetch-Site` is `cross-site`. Cookies were already `SameSite=Lax`; this is a second layer. API keys aren't affected. Test: "cross-site requests" in `developers.test.ts`.
- Server-side request forgery: webhook URLs must be https, without credentials, and resolve to public addresses, checked when saved and again before every delivery; redirects aren't followed; 10-second timeout.
- Files are served through short-lived signed URLs scoped to the workspace's storage prefix.

## A02 Security misconfiguration

- Headers on every response (`src/config/security-headers.ts`, test `tests/unit/security-headers.test.ts`): Content-Security-Policy (no framing, no plugins, no foreign forms or connections except Sentry), HSTS two years with preload, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, Permissions-Policy (microphone only for this site).
- The app refuses to start in production with development secrets, test routes switched on, or the development Stripe webhook secret (`src/server/env.ts`).
- Test-only routes (`/api/test/*`) exist only with `ENABLE_TEST_ROUTES=true`, which production refuses.
- Error responses carry a code and a plain message, never a stack trace.

## A03 Software supply chain failures

- Every dependency is pinned to an exact version and `package-lock.json` is committed; CI uses `npm ci`.
- CI runs `npm audit --omit=dev --audit-level=high` on every push. Today: 0 high or critical. 5 moderate advisories (glob, minimatch) come from Sentry's build plugin, which runs at build time only; the fixed releases are less than two weeks old, so they are scheduled for after 2026-11-16 (DECISIONS).
- GitHub Actions use pinned major versions from GitHub and Docker official images.

## A04 Cryptographic failures

- Passwords are hashed by Better Auth (scrypt). Minimum length and a breached-password check apply.
- API keys are shown once and stored only as a sha256 hash. Webhook signing secrets are encrypted at rest with AES-256-GCM (`APP_ENCRYPTION_KEY`).
- Outgoing webhooks are signed with HMAC-SHA256 and a timestamp; Stripe webhooks are verified with Stripe's library and a 5-minute tolerance.
- Backups are encrypted with AES-256 before they leave the runner.
- TLS everywhere through Vercel, Supabase and Railway; HSTS on.

## A05 Injection

- Database access goes through drizzle with bound parameters. Raw `sql` templates bind every value. No `sql.raw` with user input.
- Every request body is validated with zod schemas (`src/lib/schemas`), with lengths and enums, before it reaches a handler.
- React escapes all user text. The two `dangerouslySetInnerHTML` uses are our own theme script and JSON-LD, which escapes `<`.
- ffmpeg is called with an argument array, never a shell string, on files we name ourselves.

## A06 Insecure design

- Voice cloning requires recorded consent: the speaker reads a one-time phrase, the recording is checked against the samples, and the record is kept. With a real engine, cloning stays off until a production-grade speaker check is in place. A public-figure blocklist and a public report form back this up.
- Credits are reserved in a transaction before an engine call and refunded on failure, so a failure can't be used to get free work and a race can't overspend.
- Rate limits per user, API key and IP are stored in Postgres so they hold across servers. Sign-in has account lockout and an emailed alert.

## A07 Authentication failures

- Email verification before use; password reset links are single-use and expire.
- Two-factor sign-in (TOTP with backup codes) for everyone, required for staff. The console locks after 15 idle minutes and asks for re-authentication within 5 minutes before destructive actions.
- Sessions are httpOnly, SameSite=Lax cookies (Secure on https). A password reset, a role change, a suspension or a two-factor reset signs the account out everywhere.

## A08 Software or data integrity failures

- Stripe and outgoing webhooks are signed and time-limited.
- Uploads are checked by their bytes (`file-type`), not their name or declared type, against per-purpose size limits (`src/config/uploads.ts`, 20 MB consent clips up to 2 GB media), and rejected otherwise.
- Generated audio carries provenance metadata, and `/check-audio` verifies it.

## A09 Security logging and alerting failures

- An append-only audit log records every staff action and sensitive customer action, with the actor, target, IP and reason. The console can filter and export it.
- Sentry captures server and browser errors with personal data switched off. The uptime workflow alerts by email when `/api/health` fails.

## A10 Mishandling of exceptional conditions

- Engine and job failures refund credits and show a plain message; jobs retry with backoff and then fail cleanly.
- Sweeps are idempotent and log failures per task without stopping the others.
- `/api/health` times out after 5 seconds and returns 503 rather than hanging.

## Residual risks and follow-ups

| Risk | Why it remains | Plan |
|---|---|---|
| CSP allows inline scripts | Next.js static pages stream inline data scripts; nonces would end static rendering | Revisit when Next supports hashes for static pages |
| Webhook DNS rebinding between the check and the request | Node's fetch resolves again after our check | Low impact (POST of the customer's own event data, no response read). Pin the resolved address with a custom agent if webhooks gain sensitive data |
| Consent speaker check is a stand-in | No production-grade verifier yet | Cloning stays off on real engines until one is added (DECISIONS) |
| Moderate audit advisories in build tools | Fixes too new to adopt | Bump after 2026-11-16 |
| No external penetration test | Out of scope for the build | Before the first enterprise contract |
