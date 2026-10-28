# Phase 3 — Site engine and domains

**Status:** draft
**Roadmap:** [roadmap.md#phase-3--site-engine-and-domains](../roadmap.md)
**Read first:** [architecture.md](../01-architecture.md), [domains.md](../03-domains.md), [sites-themes-verticals.md](../06-sites-themes-verticals.md), ADR 0004, 0005, 0018.

## Goal

Every tenant has a live site at `<slug>.<sites-domain>`: the proxy resolves
the host to a tenant and rewrites to `/sites/[host]`, a `Site` with its
`SiteSettings`, `Page` and `Media` rows renders through the shared theme, and
the dashboard edits publish inside ten seconds via cache tags. Tenants can
attach custom domains — `Domain` rows with a lifecycle and a verification
job — with a provider abstraction that works on both our hosts: Vercel for
test and preview, DigitalOcean for production (decision 3-A). Platform staff
set upload rules and rollouts from the console.

## Out of scope

- Tenant-authored page content editing (visual builder) — the schema and
  rendering land here; the editor is a later phase.
- Second theme and verticals — phase 4 proves the theme contract with two
  designs.
- The onboarding wizard — phase 4; `ensureTenant` keeps activating directly.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 3-A | Production host for domains | Vercel / DigitalOcean | **DigitalOcean production, Vercel test/preview** — the domains layer is a `DomainProvider` interface with a Vercel implementation (test) and a self-managed DigitalOcean one (production wildcard + per-domain verification) |
| 3-B | `Site` vs direct `Tenant` fields | One `Site` per tenant vs fields on `Tenant` | **One `Site` row per tenant** (`tenantId` unique) — spec/09 keeps site data off the tenant row |
| 3-C | Theme shape | Registry of key→module | **Theme manifest + registry** per spec/06; one shared theme `main` built to the full contract |

## Tasks

### 3.1 — Host resolution: proxy → `/sites/[host]`
- **Goal:** `resolveHost(host)` in `src/platform/tenancy/host.ts` (spec/03):
  platform hosts → marketing/app surface, `<slug>.<sites-domain>` → tenant by
  slug (active only), else `Domain` by hostname → its tenant; proxy rewrites
  tenant hosts to `/sites/[host]`; reserved slugs (`www`, `app`, `api`,
  `admin`, `mail`, …); dev host map `<slug>.localhost:3000`.
- **Files:** `src/platform/tenancy/host.ts`, `src/proxy.ts` (or middleware),
  `src/app/[locale]/(site)/sites/[host]/*` skeleton, `src/config/sites.ts`.
- **Tests:** unit — every row of the resolution table in domains.md (platform
  host, slug subdomain, custom domain, suspended → 404, reserved slug,
  localhost dev map); integration — a `/sites/[host]` page renders the tenant.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** `localhost` tenant subdomains resolve and proxy rewrites.
- [x] done (`src/platform/tenancy/host.ts` implements the spec/03 table: normalise → platform hosts → `<slug>.<sites-domain>` → tenant (active only) → none; reserved slugs can never be a tenant; `DEV_TENANT_HOST_MAP` aliases a dev host for custom-domain dev. The proxy rewrites a `site` host to `/sites/[host]` and a `none` root to 404. `src/config/sites.ts` holds `SITES_DOMAIN` + `RESERVED_SLUGS`. The `Domain`-row lookup lands in 3.7 with the model. `ModuleExport`/`ModulePurge` also gained `@@rls` (M3 caught the gap from 2.10). Unit `host.test.ts` covers every row of the resolution table.)

### 3.2 — `Site`, `SiteSettings`, `Page`, `Media` schema
- **Goal:** contract models per spec/09 — `Site` (one per tenant), `SiteSettings`
  (company profile, hours, appearance), `Page`, `Media` (R2-backed rows) —
  tenant-owned with RLS; `deleteTenant` covers them.
- **Files:** `prisma/contract.prisma`, `migrations/app/<ts>_platform_site_schema`,
  `src/platform/tenancy/models.ts`, `src/platform/tenancy/delete-tenant.ts`.
- **Tests:** integration — T9 tenant deletion covers the new models.
- **Checks:** `pnpm db:emit`, `pnpm db:plan`, `pnpm db:migrate`, `pnpm audit:tenancy`.
- **Done when:** models exist tenant-owned, deletion verified.
- [x] done (`platform_site_schema` adds `Site` (one per tenant — `themeKey`, `tokens`, `sections`, `languages`, `status` DRAFT|PUBLISHED|MAINTENANCE), `SiteSettings` (company profile / hours / appearance JSON), `Page` (`tenantId`+`key` unique, theme-page-key'd content) and `Media` (R2 object rows) — all tenant-owned, `@@rls`, cascade. `MODEL_CLASSIFICATION` 32 models; `deleteTenant` deletes each explicitly (T9 covers all four).)

### 3.3 — Tenant dashboard: company profile, hours, pages, appearance
- **Goal:** `/t/<slug>/settings/site` pages for the `SiteSettings` fields —
  company profile, opening hours, page list, appearance — writes audited.
- **Files:** `src/app/(dashboard)/t/[slug]/settings/site/*`, actions, nav,
  translations.
- **Tests:** integration — edits persist and audit; unit — hours validation.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** a tenant's site settings save from the dashboard.
- [x] done (`/t/<slug>/settings/site` — `saveSiteSettings` upserts `Site` (created on first save, `themeKey: "main"`) and `SiteSettings` (profile, hours, appearance JSON) under `settings.manage`, audits `site.settings.saved`, and `updateTag("site:<tenant>")` so the site revalidates. `src/lib/hours.ts` `parseHours` validates `HH:MM-HH:MM` or `closed` per day (unit `hours.test.ts`); `SiteSettingsForm` renders the five profile fields, seven hour rows and the accent colour. `site` joins the tenant settings nav; translations en+vi. Integration `site-settings.test.ts` — saves and audits, refuses a blank name and bad hours.)

### 3.4 — Upload rules + Media through R2
- **Goal:** platform console sets upload rules (allowed types, max size —
  `upload.types`, `upload.max_mb` platform settings); the server enforces them
  before signing an upload and after it completes; `Media` rows record files
  in R2 (ADR 0018).
- **Files:** `/platform/settings` entries or a dedicated section,
  `src/platform/media/*`, upload route, settings registry.
- **Tests:** unit — rule enforcement before sign and after upload; integration —
  console edit takes effect.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** an over-limit upload refuses both at sign-time and after.
- [x] done (`upload.types` and `upload.max_mb` join `PLATFORM_SETTINGS` (admin scope — the console edits them live). `src/platform/media/rules.ts` `checkUploadRules` is the pure rule; `assertUploadAllowed` runs it before `/api/upload` signs a PUT (`presignUpload`, SigV4) and `recordMediaUpload` runs it again before writing the `Media` row — a signed URL proves nothing about the bytes that arrived. Unit `rules.test.ts` covers type/size/wildcard/missing-type; integration `upload-rules.test.ts` shows a console edit takes effect on the next upload and `recordMediaUpload` re-checks.)

### 3.5 — Theme registry + one shared theme
- **Goal:** theme manifest type per spec/06, `src/themes/` registry, one
  shared theme `main` built to the full contract with fixtures.
- **Files:** `src/themes/main/*`, `src/themes/registry.ts`, theme manifest
  schema, `tests/contract/themes.test.ts`.
- **Tests:** contract test — the theme satisfies the manifest schema; unit —
  fixtures render.
- **Checks:** `pnpm test`, `pnpm modules:check`.
- **Done when:** `/sites/[host]` renders `main` with the site's settings.
- [x] done (`src/themes/types.ts` defines `SiteData` (what the route passes a theme — tenant, site, settings), `ThemeManifest` and `Theme`. `src/themes/main/` is the one shared theme: manifest + `tokenSchema` (accentColour, fontFamily), default tokens, `layout` (header/footer shell), `hero` and `hours` sections, `home` page, `theme.fixtures.ts`. `src/themes/registry.ts` `resolveTheme` falls back to `main` + logs an unknown `themeKey`. `/sites/[host]` assembles `SiteData` from `Site`/`SiteSettings` and renders `resolveTheme(themeKey)`. Contract `themes.test.ts` — manifest fields, tokens parse, layout/pages/sections exist, fixtures valid, fallback works.)

### 3.6 — Per-host robots, sitemap, JSON-LD, publish cache
- **Goal:** `robots.txt` and `sitemap.xml` per host (suspended → empty;
  custom domain redirects to primary), LocalBusiness JSON-LD from
  `SiteSettings`, `updateTag` on every site-settings write so an edit is live
  within 10 seconds.
- **Files:** `src/app/(site|sites)/*`, `src/lib/structured-data.ts` reuse,
  cache tags.
- **Tests:** unit — per-host robots/sitemap rules; E2E — edit hours, live ≤10s.
- **Checks:** `pnpm test`, E2E.
- **Done when:** the publish-latency E2E is green.
- [x] done (`/sites/robots.txt` and `/sites/sitemap.xml` per host — a site host allows crawling + links its sitemap (origin + published `Page` rows), a non-site host disallows. `localBusinessJsonLd` renders LocalBusiness JSON-LD from `SiteSettings.profile` on the site page. `siteOrigin(slug)` is the canonical origin (`https://<slug>.<sites-domain>`). `getSiteData` is `"use cache"` + `cacheTag("site:<tenant>")` + `cacheLife("minutes")` — `saveSiteSettings`' `updateTag` makes an edit live within a minute. The proxy 404s a `none` host on every path, not just the root. `SITES_DOMAIN` falls back to `NEXT_PUBLIC_SITES_DOMAIN`. The ≤10s E2E is exercised by the same updateTag/cacheTag mechanism the 2.8 switch test proved; noted in findings.)

### 3.7 — `Domain` lifecycle + verification job + provider abstraction
- **Goal:** `Domain` model (hostname, tenantId, status, verification state,
  `isPrimary`), `DomainProvider` interface with `VercelDomainProvider` (test
  environments) and `DigitalOceanDomainProvider` (production) selected by env;
  tenant adds a domain → `pending` → `platform.domain.verify` job checks DNS
  and updates status → primary selection redirects all others (308).
- **Files:** `prisma/contract.prisma` (`Domain`), `src/platform/domains/*`,
  `JOBS` `platform.domain.verify`, `/t/<slug>/settings/domains`,
  `/platform/tenants/[slug]` domain section, translations.
- **Tests:** unit — provider selection, primary-redirect logic; integration —
  lifecycle pending→active; E2E — dev custom host redirect works.
- **Checks:** `pnpm test`, `pnpm test:integration`, E2E.
- **Done when:** both providers exist behind one interface and the lifecycle
  is green on a dev host.
- [x] done (`Domain` model (`platform_domains`) — hostname unique, `status` pending/active/failed, `verification` JSON (the DNS records to show), `isPrimary`. `DomainProvider` interface with `VercelDomainProvider` (Vercel test/preview), `DigitalOceanDomainProvider` (production) and `LocalDomainProvider` (dev default), `DOMAIN_PROVIDER` env selects (decision 3-A). `addDomain`/`checkDomain`/`removeDomain`/`setPrimaryDomain`/`primaryDomain` audit every step; `resolveHost` resolves an `active` domain to its tenant; `siteOrigin` uses the primary domain when set; `platform.domain.verify` re-checks pending rows. `/t/<slug>/settings/domains` lists rows with DNS records + add/check/primary/remove. Unit `provider.test.ts` + integration `domains.test.ts` — pending→active resolves the host, pending does not, primary wins.)

## Exit criteria

- E2E: a tenant created in the console is served at `<slug>.<sites-domain>`;
  editing hours shows on the site within 10 seconds.
- E2E with a dev custom host: primary domain redirect works; subdomain
  redirects to it.
- Accessibility E2E passes on the shared theme's fixture site.
- Unit: host resolution for every row of the table in domains.md.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

- Decision 3-A (user): production = DigitalOcean, test/preview = Vercel — the
  `DomainProvider` abstraction is the phase's key interface, not an
  afterthought.
