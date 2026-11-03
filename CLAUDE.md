# Working on Mimix

@AGENTS.md

- Next.js 16.4 with React 19.3: read `node_modules/next/dist/docs/` before using an API you have not checked. Notable: `error.tsx` receives `{ error, retry }`; `PageProps<'/route'>` and `LayoutProps` are global types; there is no `next lint` (use `npm run lint`).
- Every user-facing string goes in `src/i18n/messages/en` or `src/content/en`, including error messages and emails. No literal copy in components.
- Colors, spacing, radius, motion: use the tokens in `src/styles/tokens.css`. Never a raw hex in a component.
- API routes use `route({ permission, scope?, sessionOnly? }, handler)` from `src/server/api/route.ts`, `body(req, schema)` for input, and throw `UserError` for anything the user should read. Every `/api/v1` route must be listed in `OPERATIONS` in `src/server/openapi.ts` (a test checks this).
- Admin routes use `adminRoute({ permission, destructive? }, handler)` and admin pages `requireAdminPage(permission, path)` from `src/server/admin/guard.ts`. Permissions live in `src/config/admin.ts`. Every staff change takes a reason and writes `audit()`; anything hard to undo is `destructive: true` (re-auth within 5 minutes).
- Long work goes through the job queue: `registerJobHandler` in a module, and import the module in `src/server/jobs/handlers.ts`.
- Voice features call `getVoiceEngine()` from `src/server/engine.ts`. Guard a feature an engine may lack with `requireEngineFeature(...)` before charging credits. Engine-dependent numbers go in `src/config/engine-limits.ts` and stay unconfirmed until checked against the engine.
- Outside services stay behind their interfaces with local stand-ins; switching to the real service is an environment change only. Never ask for secret keys in chat.
- Before you finish: `npm run typecheck && npm run lint && npm test && npm run test:e2e`.
- Log any decision that changes scope, stack or design in `DECISIONS.md` (kept beside the project zip), and add a line to `CHANGELOG.md`.
