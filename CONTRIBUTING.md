# Contributing to Mimix

Thanks for wanting to help. Bug reports, ideas and fixes are all welcome.

## Before you start

- **Found a bug?** Open a [bug report](https://github.com/mechanicb0y/Mimix/issues/new?template=bug_report.yml). Steps to reproduce and a screenshot make it much faster to fix.
- **Have an idea?** Open a [feature request](https://github.com/mechanicb0y/Mimix/issues/new?template=feature_request.yml) first, so we can agree on the approach before you write code.
- **Found a security problem?** Don't open an issue. Follow [SECURITY.md](SECURITY.md).
- **Never paste secrets** into an issue or pull request: not your `.env.local`, API keys, tokens or recovery codes.

## Set up

You need Node.js 22 or newer. [docs/development.md](docs/development.md) has the details; the short version:

```bash
npm ci
npm run db           # Postgres (PGlite) on 127.0.0.1:5433; keep it running
npm run db:migrate
npm run dev          # http://localhost:3000
```

Everything works with no accounts or keys: each outside service has a local stand-in, and the voice engine defaults to the mock engine. To work on real voices, run the Kokoro server in [`engines/kokoro`](engines/kokoro/README.md), or use **Start Mimix** once and develop against the setup it makes.

## How the code is organised

These rules keep Mimix consistent. Pull requests that follow them are much quicker to review.

- **Words:** every user-facing string, including error messages and emails, lives in `src/i18n/messages/en` or `src/content/en`. No literal copy in components.
- **Look:** colors, spacing, radius and motion come from the tokens in `src/styles/tokens.css`. No raw hex values in components.
- **API routes** use `route({ permission, scope?, sessionOnly? }, handler)` from `src/server/api/route.ts`, read input with `body(req, schema)`, and throw `UserError` for anything the user should read. Every `/api/v1` route is listed in `OPERATIONS` in `src/server/openapi.ts` (a test checks this).
- **Admin routes** use `adminRoute({ permission, destructive? }, handler)` and admin pages `requireAdminPage(permission, path)` from `src/server/admin/guard.ts`. Permissions live in `src/config/admin.ts`. Every staff change takes a reason and calls `audit()`; anything hard to undo is `destructive: true`.
- **Long work** goes through the job queue: `registerJobHandler` in a module, imported in `src/server/jobs/handlers.ts`.
- **Voice features** call `getVoiceEngine()` from `src/server/engine.ts`, and guard a feature an engine may lack with `requireEngineFeature(...)` before charging credits. Engine-dependent numbers go in `src/config/engine-limits.ts`.
- **Outside services** stay behind their interfaces with local stand-ins; switching to the real service must be an environment change only.
- **Next.js 16** has breaking changes from earlier versions. Check `node_modules/next/dist/docs/` before using an API you haven't used here. [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) hold the same rules for AI coding agents.

## Before you open a pull request

Run the full set of checks. CI runs them too, on every push and pull request.

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
```

- Keep each pull request to one change, and describe what a user will notice.
- Add a line to [CHANGELOG.md](CHANGELOG.md).
- Add or update tests for what you changed. New pages must pass the accessibility checks (axe, WCAG 2.2 AA) in both themes.
- Include screenshots for visible changes, in light and dark themes if colors changed.

## Licence of contributions

Mimix is not open source (see [LICENSE](LICENSE)). By opening a pull request, you confirm that you wrote the contribution or have the right to submit it, and you agree that it may be used, changed and distributed as part of Mimix under its licence.

## Code of conduct

Everyone taking part in this project follows the [code of conduct](CODE_OF_CONDUCT.md).
