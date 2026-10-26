# Phase 1 — Tenancy core

**Status:** draft
**Roadmap:** [roadmap.md#phase-1--tenancy-core](../roadmap.md)
**Read first:** [tenancy](../02-tenancy.md), [data-model](../09-data-model.md), [migrations-and-data](../12-migrations-and-data.md), [testing](../11-testing.md) (T1–T10), [module-system](../15-module-system.md), ADR [0002](../adr/0002-shared-database-tenant-id-and-rls.md), [0003](../adr/0003-better-auth-organizations-for-tenants.md)

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

## Tasks

### 1.1 — Database roles and clients
- **Goal:** `app`, `platform`, `owner` roles and three connection strings, as in migrations-and-data.md.
- **Files:** migration `platform_db_roles` (roles and grants; guarded so it is a no-op where roles exist), `src/platform/db.ts` (platform client), `src/lib/env.ts` (new variables, optional until set), `.env.example`, docs in `spec/14`.
- **Tests:** integration: the app role cannot bypass RLS on a table with a policy (uses a temporary test table).
- **Checks:** `pnpm test:integration`, M1, M2.
- **Done when:** the app runs with `DATABASE_URL` on the app role.
- [ ] done

### 1.2 — Tenant, Member, Invitation, platformRole
- **Goal:** Better Auth organization plugin enabled, mapped to `Tenant`; `platformRole` on `User`.
- **Files:** `prisma/schema/platform.prisma`, `prisma/schema/kit.prisma` (one field), migration `platform_tenants`, `src/auth.ts` (plugin config, comment `Platform change`), `src/platform/tenancy/models.ts`.
- **Tests:** T5 passes with the new models classified; factory `createTenant`, `createMember`.
- **Checks:** M1, M2, audit, `pnpm build`.
- **Done when:** a tenant and member can be created through the plugin API in an integration test.
- [ ] done

### 1.3 — Permissions map
- **Goal:** one file mapping tenant and platform roles to permission strings.
- **Files:** `src/platform/tenancy/permissions.ts` + test.
- **Tests:** every role × permission pair in a table-driven test; unknown permission is a type error.
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
- **Goal:** owners invite by email (Brevo through `sendEmail`), change roles, remove members.
- **Files:** members page and actions under `/t/[slug]/settings/members`, email template, translations.
- **Tests:** only owners can invite; last owner cannot be removed or demoted; expired invitation refused.
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

### 1.13 — Tenant deletion job
- **Goal:** delete a tenant completely, driven by the classification list and module `onPurge` hooks.
- **Files:** `src/platform/tenancy/delete-tenant.ts`, job registration, console action with confirmation.
- **Tests:** T9.
- [ ] done

## Exit criteria
- T1–T10 green in CI.
- `pnpm audit:tenancy`, M1–M3 green.
- Query overhead of `tenantDb` recorded in Findings.

## Findings
_none yet_
