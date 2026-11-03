## What this changes

<!-- What will a user, a developer or staff notice? Link the issue it closes, e.g. "Closes #12". -->

## Why

## Screenshots

<!-- For visible changes. Light and dark themes if colors changed. -->

## Checks

- [ ] `npm run typecheck && npm run lint && npm test && npm run test:e2e` pass
- [ ] User-facing text is in `src/i18n/messages/en` or `src/content/en`; colors and spacing use the tokens
- [ ] New `/api/v1` routes are listed in `OPERATIONS` in `src/server/openapi.ts`
- [ ] Staff actions take a reason and write `audit()`
- [ ] `CHANGELOG.md` has a line for this change
- [ ] No secrets, `.env.local` contents or personal data
