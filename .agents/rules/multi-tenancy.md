# Multi-tenancy

Applies to everything under `src/platform/`, `src/modules/`, `src/app/(dashboard)/`,
`src/app/(platform)/`, `src/app/sites/`, `prisma/`. Design: `spec/02-tenancy.md`.

A record shown to the wrong tenant is the worst defect this product can have.
These rules exist so that it cannot happen by forgetting one `where`.

- **Tenant data goes through `tenantDb(ctx)`.** The raw `db8` client is for
  `src/platform/` and migrations only. A module service that imports
  `@/lib/db8` is wrong even if every query has a `tenantId`.
- **Services take `TenantContext` first** and never read the session, the
  host or the URL themselves. Build the context with `requireTenantMember`
  (dashboard), `getSiteContext` (public site) or a `system` context from a
  trusted record (jobs, webhooks). Never from request input.
- **The tenant id never comes from the client.** Not from a form field, a
  query string, a header or a JSON body. The slug in the dashboard URL is
  checked against membership; the host on a site is resolved by the platform.
- **Every new model is classified** in `src/platform/tenancy/models.ts` as
  tenant-owned or global, in the same change that adds it. Tenant-owned
  models get `tenantId`, `@@index([tenantId, ...])`, per-tenant uniques
  (`@@unique([tenantId, slug])`) and an RLS policy in the migration. The CI
  tenancy audit fails otherwise.
- **Child rows carry `tenantId` too.** Do not rely on the parent for scope.
- **Other tenants' records are 404, never 403.** Do not reveal that they exist.
- **Caches are keyed by tenant.** Any `unstable_cache`, `"use cache"` or tag
  includes the tenant id; nothing tenant-specific is cached under a global key.
- **Files are prefixed** `tenants/<tenantId>/` in storage; signed URLs are
  created only after the scope check.
- **Platform staff actions are audited.** Impersonation, overrides, plan
  changes, suspensions write `AuditLog` with a reason.
- **Every module ships an isolation test**: the same fixture data in two
  tenants, each service called with tenant A's context, asserting nothing of
  tenant B is returned or changed.
- **Never branch on a specific tenant** (`if (tenant.slug === "...")`). A
  difference between tenants is a plan, a switch, a setting or a theme.

---

Based on: `spec/02-tenancy.md` and ADR 0002, and the tenant isolation model proven in platform.madelab.io.
