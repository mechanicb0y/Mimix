# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.8.x | Yes |
| Older | No: please update first |

## Reporting a vulnerability

**Please don't report security problems in public issues, discussions or pull requests.**

Report them privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/mechanicb0y/Mimix/security/advisories/new)). Include:

- what the problem is and what an attacker could do with it,
- the steps or a proof of concept to reproduce it,
- the version or commit, and whether you ran Mimix with Start Mimix, `npm run dev` or a hosted build,
- any logs, with secrets removed.

You should get a first reply within a week. Once a fix is ready, it is released and the advisory is published, crediting you if you'd like.

## Scope

In scope: the Next.js app (website, app, admin console), the `/api/v1` and `/api/admin` APIs, the voice engine servers in `engines/`, the local launcher in `scripts/local`, and the GitHub workflows.

Out of scope: third-party services (Stripe, Supabase, Resend, Sentry, model hosts), denial-of-service or load tests, social engineering, and problems that need physical access to a computer that is already unlocked.

## Good faith

If you act in good faith, avoid privacy violations and service disruption, use only accounts you own or have permission to test, and give a reasonable time to fix the problem before you tell anyone else, we won't pursue or support legal action against you.

## How Mimix is protected

[docs/security-review.md](docs/security-review.md) is the OWASP Top 10 review: authentication and two-factor sign-in, role checks on every admin page and call, origin checks, security headers, rate limits, signed media URLs, encrypted webhook secrets, the audit log and the risks that remain.
