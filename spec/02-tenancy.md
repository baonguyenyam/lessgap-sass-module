# Tenancy

**Status:** `draft`

## The model

- A **Tenant** is one business. It owns exactly one **Site** in v1 and every
  business record: services, staff, appointments, products, orders, quotes,
  customers, knowledge sources, media, settings.
- A **User** is a login. A user can be a **Member** of several tenants (an
  owner with two salons, our designer helping several clients) with one role
  in each.
- **Platform staff** are users with a `platformRole`. That role is separate
  from any tenant membership and never implied by one.
- A **Customer** is not a user. Customers belong to one tenant and sign in, if
  at all, with a tenant-scoped magic link or one-time code. A person who books
  at two salons is two customers. This keeps every tenant's customer list its
  own and makes deleting a tenant complete.

Tenants are Better Auth organizations ([ADR 0003](./adr/0003-better-auth-organizations-for-tenants.md)):
the `Tenant` table is the organization table, with our columns added. The
kit's single-user `Subscription` moves from `User` to `Tenant` in phase 1.

## Roles

Built-in tenant roles:

| Role | Scope | Can |
| --- | --- | --- |
| `platform.owner` | all | everything, including platform staff and payouts settings |
| `platform.admin` | all | tenants, plans, switches, themes, impersonation |
| `platform.support` | all | read tenants, impersonate with reason, no billing changes |
| `platform.designer` | assigned tenants | theme and content of assigned tenants, no billing, no customers' personal data |
| `tenant.owner` | one tenant | everything in the tenant, billing, members, delete tenant |
| `tenant.manager` | one tenant | content, services, prices, bookings, orders, quotes, chatbot sources |
| `tenant.staff` | one tenant | own calendar and the bookings assigned to them |

The user who creates the tenant is its first `tenant.owner` — paying plan or
free plan alike. Owners then invite sub-users and may define **custom roles**
("nhóm quyền"): named sets of permission strings stored as `organizationRole`
rows through Better Auth's `dynamicAccessControl` ([ADR 0019](./adr/0019-tenant-roles-are-permission-groups.md)).
A member holds exactly one role — built-in or custom. `tenant.owner` is
immutable: permissions uneditable, role undeletable, last owner undemotable.
Custom roles are gated by the `roles.custom` feature and capped by the
`roles.max` limit.

Permissions are checked as `(entitlement) AND (role permission)`. A plan that
includes the shop does not let `tenant.staff` — or a custom role — edit
prices it does not declare. The permission catalog lives in one file,
`src/platform/tenancy/permissions.ts`, built from module manifests plus
kernel permissions; nothing else decides what a role can do.

## TenantContext

Every service call gets one. It is built in exactly two places:

```ts
type TenantContext = {
  tenantId: string
  actor:
    | { kind: "member"; userId: string; role: TenantRole }
    | { kind: "platform"; userId: string; role: PlatformRole; impersonating: true; reason: string }
    | { kind: "customer"; customerId: string | null }   // public site, possibly anonymous
    | { kind: "system"; job: string }                    // cron, webhook, queue
}
```

- `requireTenantMember(slug, permission?)` for dashboard routes and actions:
  reads the session, loads the membership for `slug`, checks the permission,
  returns the context or throws.
- `getSiteContext(host)` for the public site: resolves the host to an active
  tenant, returns a context with a `customer` actor.
- Webhooks and jobs build a `system` context from a tenant id they read from a
  trusted record (a Stripe account id mapped to a tenant, a job row), never
  from request input.

## Data access: three lines of defence

1. **Scoped client.** `tenantDb(ctx)` returns a Prisma client extension that
   adds `tenantId: ctx.tenantId` to every `where` and every `data` on
   tenant-owned models, and throws if a query on one of them arrives without
   it. Module services use only this client. The raw `prisma` client is
   allowed in `src/platform/` and in migrations, nowhere else.
2. **Postgres RLS.** Every tenant-owned table has a policy
   `"tenantId" = current_setting('app.tenant_id', true)`. `tenantDb` runs its
   queries in a transaction that sets `app.tenant_id` with `SET LOCAL`, which
   is safe with a connection pooler. A bug in line 1 becomes an empty result,
   not a leak. Platform-wide reads use a role that bypasses RLS, only from
   `src/platform/`.
3. **Audit in CI.** `scripts/audit-tenancy.mjs` reads the Prisma schema and
   fails when a model is neither listed as tenant-owned (has `tenantId`, an
   index starting with `tenantId`, an RLS policy in a migration) nor listed as
   global with a reason. A new model without a decision cannot be merged.

Child rows (appointment line items, order lines) carry `tenantId` too, even
though the parent has it. Denormalising one column is cheaper than an RLS
policy with a join on every query, and it lets line 1 work without knowing
the relation graph.

### Model classification

| Class | Rule | Examples |
| --- | --- | --- |
| Tenant-owned | `tenantId` column, `@@index([tenantId, ...])`, RLS policy, scoped client only | Service, Appointment, Product, Order, Quote, Customer, KnowledgeChunk, Media, MemberNotification |
| Global | no `tenantId`, readable by all, writable by platform staff only | Plan, Theme, Vertical, PlatformSwitch, FeatureDefinition |
| Identity | owned by Better Auth | User, Session, Account, Member, Invitation |
| Platform-private | no `tenantId`, platform staff only | AuditLog (has nullable `tenantId` for filtering), PlatformInvoice |

The classification list lives in `src/platform/tenancy/models.ts` and is what
the CI audit reads.

## Impersonation

Platform staff open a tenant's dashboard as the tenant would see it, to
support or to set up a site. It requires a written reason, shows a banner the
whole time, writes an audit entry on start and on every mutation, and expires
after 60 minutes. Impersonation never grants access to payout settings or to
deleting the tenant.

## Tenant lifecycle

| State | Site | Dashboard | Billing |
| --- | --- | --- | --- |
| `provisioning` | not served | onboarding wizard only | — |
| `active` | served | full | normal |
| `past_due` | served, with grace period from the plan | banner, billing reachable | Stripe dunning |
| `suspended` | maintenance page | owner can reach billing and export only | — |
| `canceled` | not served after the plan's retention | read-only export for 30 days | — |
| `deleted` | gone | gone | records required for tax kept |

Deleting a tenant removes every tenant-owned row in one job driven by the
model classification list, removes its domains from Vercel, deletes its media
prefix and its embeddings, and keeps only what law requires (invoices).
A test asserts that after deletion no tenant-owned table holds a row with that id.

## Required tests

- Integration: two tenants with the same data shapes; every module service
  called with tenant A's context never returns or modifies tenant B's rows.
- Integration: a raw query with `app.tenant_id` set to A returns no rows of B (RLS).
- Unit: `tenantDb` throws on a tenant-owned model queried without the scope.
- E2E: a member of A requesting `/t/<b-slug>/...` gets 404, not 403 (do not
  reveal that the tenant exists).
