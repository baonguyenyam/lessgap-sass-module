# Phase 1 — Tenancy core

**Status:** approved (by the product owner, 2026-10-28)
**Roadmap:** [roadmap.md#phase-1--tenancy-core](../roadmap.md)
**Read first:** [tenancy](../02-tenancy.md), [data-model](../09-data-model.md), [migrations-and-data](../12-migrations-and-data.md), [testing](../11-testing.md) (T1–T10, O1–O8), [module-system](../15-module-system.md), [operations](../16-operations.md), ADR [0002](../adr/0002-shared-database-tenant-id-and-rls.md), [0003](../adr/0003-better-auth-organizations-for-tenants.md)

## Goal
Users belong to tenants with roles; every tenant-owned query is scoped by
`tenantDb` and by RLS; the dashboard lives under `/t/[slug]`; platform staff
have a console to list, suspend and impersonate tenants, with an audit log.
No business module is built here; the kit's `Project` example is retired, and
the phase ends with the kernel ready to host modules.

## Out of scope
Plans and limits (phase 2), sites and domains (phase 3), any business module (phase 4+).

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 1-A | Existing kit users in the current database | create one tenant per user / start empty | **One tenant per existing user**, 2026-10-26 |
| 1-B | Self-service tenant creation in this phase | staff-created only / signup creates tenant | staff-created only in phase 1 (default); self-service signup arrives with the `signup.*` switches in phase 2 |
| 1-C | Invitation expiry | 7 days / other | **7 days**, 2026-10-26 |
| 1-D | Tenant role model | fixed enum / custom groups | **Built-in owner/manager/staff + custom role groups via `dynamicAccessControl`** ([ADR 0019](../adr/0019-tenant-roles-are-permission-groups.md)), 2026-10-26 |
| 1-E | Kit `/admin` area | ADMIN+ROOT / ROOT only | **ROOT only** (done 2026-10-26); staff surface is `/platform` |

## Tasks

### 1.1 — Database roles and clients
- **Goal:** `app`, `platform`, `owner` roles and three connection strings, as in migrations-and-data.md.
- **Files:** migration `platform_db_roles` (roles and grants; guarded so it is a no-op where roles exist), `src/platform/db.ts` (platform client), `src/lib/env.ts` (new variables, optional until set), `.env.example`, docs in `spec/14`.
- **Tests:** integration: the app role cannot bypass RLS on a table with a policy (uses a temporary test table).
- **Checks:** `pnpm test:integration`, M1, M2.
- **Done when:** the app runs with `DATABASE_URL` on the app role.
- [x] done (integration on PostgreSQL: the app role sees only its `app.tenant_id`, cannot turn `row_security` off or write into another tenant, and reads and writes the application tables; the platform role reads across tenants. `pnpm db:roles` ran on the development database: `app` without and `platform` with `BYPASSRLS`. Shipped differently: a script instead of the migration `platform_db_roles`, because Prisma 8 refuses a contract-neutral migration without a data invariant and only runs such an edge when a ref asks for it (Findings). Switching a deployment's `DATABASE_URL` to an app login needs login roles with passwords, which the owner creates in the provider's console (spec/14, "Database roles").)

### 1.2 — Tenant, Member, Invitation, platformRole
- **Goal:** Better Auth organization plugin enabled, mapped to `Tenant`; `platformRole` on `User`; `ac` + static `roles` (`owner`, `manager`, `staff`) and `dynamicAccessControl` for custom roles ([ADR 0019](../adr/0019-tenant-roles-are-permission-groups.md)).
- **Files:** `prisma/schema/platform.prisma`, `prisma/schema/kit.prisma` (one field), migration `platform_tenants` (org + member + invitation + organizationRole tables), `src/auth.ts` (plugin config, comment `Platform change`), `src/platform/tenancy/models.ts`.
- **Tests:** T5 passes with the new models classified; factory `createTenant`, `createMember`.
- **Checks:** M1, M2, audit, `pnpm build`.
- **Done when:** a tenant and member can be created through the plugin API in an integration test.
- [ ] done

### 1.3 — Permissions registry
- **Goal:** one file declaring every `<module>.<verb>` permission (from manifests + kernel) and the built-in roles' grants; custom roles validate against it.
- **Files:** `src/platform/tenancy/permissions.ts` + test; `ac`/`roles` wiring in `src/auth.ts`.
- **Tests:** every role × permission pair in a table-driven test; unknown permission is a type error; a custom role created through the plugin refuses an undeclared permission.
- **Checks:** `pnpm test`.
- [ ] done

### 1.4 — TenantContext and requireTenantMember
- **Goal:** the context type and its two builders for dashboard and system use.
- **Files:** `src/platform/tenancy/context.ts`, `src/platform/tenancy/require-member.ts`, tests.
- **Tests:** T7 (removed member loses access next request); non-member gets `not_found`; permission missing gets `forbidden`.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- [ ] done

### 1.5 — tenantDb (scoped client) and RLS helper
- **Goal:** Prisma extension that injects and enforces `tenantId`, inside a transaction with `SET LOCAL app.tenant_id`.
- **Files:** `src/platform/tenancy/tenant-db.ts`, `src/platform/tenancy/rls.ts`, tests; first tenant-owned table used for tests only (`TenantNote`, test-only model or a real small model such as `TenantSetting`).
- **Tests:** T4 (unit), T1, T2, T3 (integration with `withTwoTenants`), M3.
- **Checks:** `pnpm test`, `pnpm test:integration`; measure query overhead and record it in Findings.
- [ ] done

### 1.6 — Tenant settings and module enablement storage
- **Goal:** `TenantModule` (as in data-model.md) and `isModuleActive` using it (entitlements arrive in phase 2). `ModulePurge` and `ModuleExport` and the Settings → Modules page are phase 2.
- **Files:** `prisma/schema/platform.prisma`, migration, `src/platform/modules/runtime.ts`, tests.
- **Tests:** enable/disable is idempotent; disabling a dependency is refused; disabled module's routes 404 (integration with a fixture module).
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- [ ] done

### 1.7 — Dashboard under /t/[slug] and tenant switcher
- **Goal:** move the dashboard routes, land users on their last or only tenant, switch tenants.
- **Files:** `src/app/(dashboard)/t/[slug]/...`, redirects from `/dashboard`, `src/proxy.ts` (prefix list), layout, `src/locales/*.json`.
- **Tests:** T6 (E2E: member of A gets 404 on B); redirect from `/dashboard` to the right tenant.
- **Checks:** `pnpm test:e2e` for the touched specs, accessibility spec.
- [ ] done

### 1.8 — Invitations and members page
- **Goal:** owners invite by email (Brevo through `sendEmail`), assign a role on invite, change roles, remove members.
- **Files:** members page and actions under `/t/[slug]/settings/members`, email template, translations.
- **Tests:** only roles with `members.manage` invite; last owner cannot be removed or demoted; expired invitation refused; role select offers built-in and custom roles.
- **Checks:** unit, integration, one E2E.
- [ ] done

### 1.8b — Tenant roles page ("nhóm quyền")
- **Goal:** `/t/[slug]/settings/roles`: list built-in + custom roles, create/edit/delete a custom role as permission checkboxes grouped by module ([ADR 0019](../adr/0019-tenant-roles-are-permission-groups.md)).
- **Files:** roles page and actions under `/t/[slug]/settings/roles`, permission-grouped UI, translations.
- **Tests:** `roles.custom` feature off → page hidden and actions refuse; `roles.max` cap enforced through `maximumRolesPerOrganization`; `owner` role uneditable/undeletable; a role with members cannot be deleted; edited permissions apply on the member's next request (T7 pattern).
- **Checks:** unit, integration, one E2E.
- [ ] done

### 1.9 — Audit log
- **Goal:** `AuditLog` model and `audit()` writer; used by members, roles, suspension, impersonation.
- **Files:** schema, migration, `src/platform/audit/*`, tests.
- **Tests:** each audited action writes exactly one row with actor, tenant and reason where required.
- [ ] done

### 1.10 — Platform console skeleton
- **Goal:** `/platform` for platform staff: tenants list (search, status), tenant detail, create tenant, suspend/reactivate.
- **Files:** `src/app/(platform)/platform/...`, `src/proxy.ts`, translations.
- **Tests:** T10; suspended tenant's members are blocked on the next request (integration).
- **Checks:** E2E for list → detail → suspend.
- [ ] done

### 1.11 — Impersonation
- **Goal:** staff open a tenant dashboard as the tenant, with reason, banner, audit, 60-minute expiry.
- **Files:** `src/platform/tenancy/impersonation.ts`, banner component, console action.
- **Tests:** T8.
- [ ] done

### 1.12 — Migrate kit data and retire Project
- **Goal:** per decision 1-A, every existing user gets a tenant (named after the user, slug from the name, the user as owner, their subscription or purchases moved to it); `Project` leaves the product surface (model kept until a contract migration in a later phase).
- **Files:** backfill `scripts/backfills/2026xxxx-platform-tenant-per-user.ts`, dashboard nav, tests.
- **Tests:** M4 (backfill idempotent).
- [ ] done

### 1.13 — Ops pages in the platform console
- **Goal:** `/platform/jobs`, `/platform/emails` (Email Audit Logs), `/platform/errors` — the operations surface from [operations.md](../16-operations.md#the-ops-pages).
- **Files:** `src/app/(platform)/platform/jobs/*`, `src/app/(platform)/platform/emails/*`, `src/app/(platform)/platform/errors/*`, console nav, translations.
- **Tests:** pages refuse non-staff (T10 pattern); email logs search by tenant, kind and status and offer payload preview/resend; retry and run-now actions re-scope through `requirePlatformRole`; resolving a digest sets `resolvedAt` and a recurrence clears it.
- **Checks:** `pnpm test`, `pnpm test:integration`; E2E walk of the three pages.
- **Done when:** a failed job and a masked error are visible and actionable in the console without psql or Vercel logs.
- [ ] done

### 1.14 — Tenant deletion job
- **Goal:** delete a tenant completely, driven by the classification list and module `onPurge` hooks.
- **Files:** `src/platform/tenancy/delete-tenant.ts`, job registration, console action with confirmation.
- **Tests:** T9.
- [ ] done

## Exit criteria
- T1–T10, R1–R6 and O8 green in CI.
- `pnpm audit:tenancy`, M1–M3 green.
- Query overhead of `tenantDb` recorded in Findings.

## Findings
- 2026-10-28, task 1.1: Prisma 8 rejects a migration whose `from` equals its `to` (`MIGRATION.CHECK_NOOP_SELF_EDGE`) unless an operation carries an `invariantId`, and the runner takes such an edge only when the target ref requires that invariant, so `pnpm db:migrate` would never apply it. Database roles are cluster objects with no contract counterpart, so they live in `scripts/db-roles.mjs` (`pnpm db:roles`), run once per database, by CI after M1 and by the integration setup.
- 2026-10-26: Switch As (ADR 0015) already gives ROOT a session as another
  account through `Session.switchedBy` and the `switchAs` plugin in
  `src/auth.ts`. The impersonation task should extend it (reason, tenant,
  60-minute expiry already in place) rather than add a second mechanism, and
  the `AuditLog` task should make Switch As start and stop write rows too.
