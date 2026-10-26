## What and why

<!-- One or two sentences. Link the brief task: spec/phases/phase-N.md → task N.x -->

Brief task: 

## How it was verified

<!-- Commands you ran and their result. "Not run" is an honest answer; say why. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:integration` (when it exists)
- [ ] `pnpm test:e2e` for touched flows
- [ ] Test-case catalogue ids covered: 

## Checklist

- [ ] Only the files the brief task lists (or the brief was updated first)
- [ ] Tenant-owned data: scoped client, `tenantId`, RLS in the migration, model classified, isolation test
- [ ] Gated behaviour checked server-side (`requireModule` / `requireFeature` / `consumeLimit`)
- [ ] Migration is backward compatible with the deployed code (expand/contract)
- [ ] User-facing text in `src/locales/`; no tenant or platform names in components
- [ ] No secrets, no `.env`, no personal data in logs
- [ ] Spec, ADR or brief updated if behaviour or a decision changed
- [ ] `CHANGELOG.md` entry if user-visible

## Findings

<!-- Anything discovered that affects the spec or later tasks. -->
