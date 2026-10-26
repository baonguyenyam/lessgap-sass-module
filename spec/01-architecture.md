# Architecture

**Status:** `draft`

## One deployment, three surfaces

```mermaid
flowchart LR
  V[Visitor] -->|www.platform.com| M[Marketing + signup]
  O[Owner / staff] -->|app.platform.com| D[Dashboard]
  P[Platform staff] -->|app.platform.com/platform| A[Platform console]
  C[Customer] -->|slug.sites-domain.com or their-domain.com| S[Tenant site]
  M & D & A & S --> N[Next.js app on Vercel]
  N --> DB[(PostgreSQL + pgvector)]
  N --> ST[Stripe Billing + Connect]
  N --> E[Resend email / SMS provider]
  N --> L[LLM + embeddings provider]
```

All four surfaces are the same Next.js application. `src/proxy.ts` decides
which one a request belongs to, from the hostname, and rewrites it to an
internal route. Nothing else in the app reads the hostname.

| Hostname | Surface | Internal route |
| --- | --- | --- |
| `www.<platform>`, `<platform>` | Marketing | `src/app/[locale]/(public)` (existing) |
| `app.<platform>` | Dashboard, platform console, auth | `src/app/(dashboard)`, `src/app/(platform)`, `src/app/(auth)` |
| `<slug>.<sites-domain>` | Tenant site | rewritten to `src/app/sites/[host]/...` |
| any verified custom domain | Tenant site | rewritten to `src/app/sites/[host]/...` |
| anything else | 404 | — |

The rewrite target carries the hostname, not the tenant id. The site layout
resolves the host to a tenant with `getSiteByHost(host)` (cached), so a
tampered path cannot select another tenant. Direct requests to `/sites/...`
on any host are refused by the proxy.

## Layers

```
app route (page, layout, route handler, server action)
  → module service  (src/modules/<module>/server/*)      business rules, entitlement checks
    → tenant data access (tenantDb(ctx))                  tenant-scoped Prisma
      → PostgreSQL (RLS as a second line, see tenancy)
```

- A route never queries Prisma directly for tenant data. It calls a module service.
- A service takes a `TenantContext` as its first argument. It never reads the
  session itself, so it can be called from a job, a webhook or a test.
- Pure rules (prices, availability, fee calculation, limits) are functions in
  `src/modules/<module>/lib/` with tests beside them, as the kit already does in `src/lib`.

## Where code lives

Kit code stays where it is. Platform code is added in new places so that
upstream merges stay small ([ADR 0001](./adr/0001-fork-and-keep-upstream-mergeable.md)).

```
src/
  platform/                 cross-cutting platform core
    tenancy/                TenantContext, tenantDb, host resolution, membership
    entitlements/           registry of features and limits, resolve, require, usage
    switches/               platform switches
    domains/                Vercel domain API wrapper, verification
    audit/                  audit log writer
    jobs/                   background job runner and schedules
  modules/<module>/         one folder per business module (see below)
  themes/<themeKey>/        one folder per theme (see sites-themes-verticals)
  verticals/<verticalKey>.ts  one preset per industry
  app/
    (platform)/platform/    platform console
    (dashboard)/t/[slug]/   tenant dashboard
    sites/[host]/           tenant site, only reached by proxy rewrite
```

### Module folder shape

Every module has the same shape. A module that needs less leaves folders out;
it never invents new ones.

```
src/modules/booking/
  module.ts            manifest: key, name, features it declares, nav entries, dependencies
  schema.ts            Zod schemas shared by forms and services
  lib/                 pure functions + *.test.ts
  server/              services ("server-only"), each takes TenantContext first
  actions.ts           "use server" actions: auth → context → parse → service → revalidate
  components/          dashboard UI for this module
  site/                building blocks themes use to render this module publicly
  jobs.ts              scheduled or queued work, if any
```

A module may import from `src/platform/*`, from kit code and from another
module's `server/` **public index only** (`src/modules/<other>/server/index.ts`).
It never imports another module's components or internals. The module
registry (`src/modules/registry.ts`) is the only list of modules.

## Technology choices

| Concern | Choice | Why | ADR |
| --- | --- | --- | --- |
| App | Next.js 16 App Router, React 19 | What the kit is | — |
| Auth | Better Auth with the organization plugin | Already in the kit; organizations, members, roles, invitations | [0003](./adr/0003-better-auth-organizations-for-tenants.md) |
| Database | PostgreSQL (Neon), Prisma 7 | Already in the kit; branching for previews | — |
| Isolation | Shared tables with `tenantId`, scoped client, Postgres RLS | Lowest cost per tenant, proven in platform.madelab.io | [0002](./adr/0002-shared-database-tenant-id-and-rls.md) |
| Hosting, domains | Vercel for Platforms | Wildcard subdomains, custom domains with automatic SSL, domain API | [0004](./adr/0004-vercel-for-subdomains-and-custom-domains.md) |
| Themes | React components in the repo, registry by key | Designers already work in code; type-checked; no runtime HTML | [0005](./adr/0005-themes-are-code.md) |
| Tenant payments | Stripe Connect | Tenants get paid directly, we take an application fee | [0006](./adr/0006-stripe-connect-for-tenant-payments.md) |
| Chatbot retrieval | pgvector in the same database | One database, tenant filter and RLS apply to embeddings too | [0007](./adr/0007-pgvector-for-rag.md) |
| Background work | Vercel Cron + a jobs table processed by a cron route | No new infrastructure until volume needs it | [0008](./adr/0008-jobs-table-before-a-queue.md) |
| Email | Resend (kit) | Already in the kit | — |
| SMS | Twilio, behind an interface | Reminders; consent rules in compliance doc | — |
| Media | Vercel Blob or S3-compatible storage, tenant-prefixed keys | Images for services, menus, galleries | — |

## Caching

- Tenant site pages are cached per host and revalidated by tag when the tenant
  saves content: `revalidateTag(siteTag(tenantId))`. A save in the dashboard
  shows on the site within seconds without a deploy.
- Host → tenant resolution is cached and invalidated when a domain changes.
- Entitlements are cached per tenant and invalidated on plan change, override
  change or switch change.
- Never cache anything per customer in a shared cache key.
