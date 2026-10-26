# Environments and release

**Status:** `draft`

## Environments

| Environment | URL | Database | Stripe | Email | Who |
| --- | --- | --- | --- | --- | --- |
| Local | `localhost:3000`, sites on `<slug>.localhost:3000` | local Docker Postgres or a personal Neon branch | test mode | Brevo with a test sender, or none (email flows hide) | each developer and agent |
| Preview | Vercel preview URL per PR | Neon branch per PR, created from staging, migrated by CI | test mode | Brevo to an allow-list only | reviewers |
| Staging | `staging.lessgap.app`, sites on `<slug>.staging.lessgap.io` | Neon `staging` branch | test mode | Brevo to an allow-list only | team, demo tenants |
| Production | `lessgap.app`, `app.lessgap.app`, `<slug>.lessgap.io`, custom domains | Neon `main` | live mode | Brevo (then SES) | customers |

- Secrets live in Vercel environment variables per environment; `.env` is
  local only and never committed. `.env.example` lists every variable with an
  empty value and a comment.
- Live Stripe keys exist only in Production. A non-production deploy with a
  live key fails the boot check (added in phase 2).
- Email from non-production environments goes only to addresses in
  `EMAIL_ALLOWLIST`; everything else is logged and dropped.

## Branching and pull requests

- `main` is always deployable. Work happens on short-lived branches
  `<phase>/<task>` (`p1/tenant-context`), one task per PR when possible.
- Every PR uses the template in `.github/pull_request_template.md` and links
  the phase brief task it implements.
- CI must be green: install (frozen lockfile), type-check, lint, unit and
  contract tests, integration tests with Postgres, migration checks, build,
  dependency audit. E2E runs on PRs that touch UI or flows, and on `main`.
- Unfinished work merges behind a module or feature stage
  (`experimental`), not on a long-running branch.

## Deploys

1. Merge to `main`.
2. CI runs `prisma db migrate` against Production with the owner role
   **before** the Vercel production build is promoted. Migrations are
   backward compatible by rule ([migrations-and-data.md](./12-migrations-and-data.md)),
   so the old deployment keeps working during the build.
3. Vercel builds and promotes.
4. Post-deploy smoke: health endpoint, one tenant site, sign-in page.
5. Backfills, if any, run after the deploy that expands and before the one that contracts.

## Rollback

- Code: promote the previous Vercel deployment (instant).
- Schema: never rolled back; fix forward with a new migration. This is why
  every migration must be compatible with the previous code.
- Data: Neon point-in-time restore to a branch, compare, copy back what is
  needed. Practised once in phase 8.

## Versioning and changelog

- The product follows SemVer in `package.json` and `CHANGELOG.md` (Keep a Changelog).
- Each module has its own `version` in its manifest for its contract (events,
  public service API, settings schema).
- Tenant-facing changes are also summarised in a "What's new" entry in the dashboard (phase 4+).

## Inherited kit code

There is no upstream to merge ([ADR 0011](./adr/0011-independent-project-kit-as-reference.md)).
Dependencies are kept current by Dependabot and the `pnpm audit` CI step. If
the kit later fixes something we also have, port it by hand as a normal change.
