# Owner requirements

Standing requirements from the owner, newest first. Each entry says where the
requirement is specified so agents read the source, not this summary. When a
requirement becomes spec, ADR, rule or test, the pointer is updated and this
file stays the index — not the place requirements are defined.



## 2026-10-30 — App shell and list UI follow shadcn-admin and platform.madelab.io

The owner fixed the UI conventions: a dropdown in the sidebar header (tenant
switcher with "Add team"), submenus on sidebar items, theme, language and
account dropdown at the top right, list pages with the action buttons on the
right of the heading, a faceted-filter toolbar with a View toggle, a floating
selection bar and numbered pagination. Reference
[satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) and above
all platform.madelab.io, which most pages (Profile, Settings, Tenants)
should resemble; structure only, no code copied. Specified in
`.agents/rules/ui-accessibility.md`, "Sidebar + header + list conventions".
## 2026-10-30 — Sidebar complete and permission-aware

The owner asked for the dashboard sidebar to list every page and respect
permissions (structure inspired by platform.madelab.io, no code copied).
Specified in `src/components/layout/app-shell/nav.ts` (each item's `module`
and `permission` mirror its page's guards) and tested in
`tests/unit/components/layout/app-shell/nav.test.ts` and
`tests/e2e/sidebar.spec.ts`.
## 2026-10-28 — Continue phase 1 with task 1.8b

The owner asked to continue with task 1.8b (tenant roles page) after 1.8.

## 2026-10-28 — Continue phase 1 with task 1.8

The owner asked to continue with task 1.8 (invitations and members) after 1.7.

## 2026-10-28 — Phase 1 approved

The owner approved `spec/phases/phase-1.md` and asked for its tasks in order,
from 1.1, on `main`.

## 2026-10-27 — Finish phase 0 without stopping to ask

The owner asked for phase 0 to be completed through task 0.16 while away.
Done: 0.10, 0.12–0.16, each on its own `p0/<task>` branch, committed locally,
not pushed. Open: 0.11 (domains do not resolve; owner's purchase and DNS) and
the Sentry scratch-DSN check (needs a Sentry project) → Findings in
`spec/phases/phase-0.md`.

## 2026-10-27 — Status surfaces use semantic colours

Danger, warning, info, success and accent surfaces must use their matching
semantic colour for the border as well as the background, text and icon; a
neutral grey border is not suitable for a colour-coded status. Add a theme token
when the status token is missing, support light and dark themes, and never rely
on colour alone → `.agents/rules/ui-accessibility.md`.

## 2026-10-27 — Admin pages informed by earlier projects

The owner wants these pages considered for this project after studying the
logic of the earlier projects: Upload rules, Email templates (a standalone
page, not a tab), Company profile, Teams and Email Audit Logs. Learn their
logic only; never reuse their code. The references already named in project
memory are `vnbca.org`, `bellav-2026` and `platform.madelab.io`. The owner
confirmed the ownership split on 2026-10-27: Upload rules, Email templates and
Email Audit Logs belong in the ROOT/platform console; Company profile and
Teams belong in each tenant's dashboard. “Teams” means tenant staff management
(`StaffMember`, optionally linked to a login), not platform user groups or
roles. → current request; phase placement in `spec/roadmap.md` and page
behavior in `spec/16-operations.md` / `spec/07-modules.md`.

Reference research (logic only): the app.madelab.io admin exposes Email
Templates as its own navigation page with a template list, preview, test send
and a link to Email Logs. Email Logs has search, status and time-range filters,
page-size selection, pagination, and delivery columns such as recipient,
subject, sender, status, message id and error. Settings separates Company Info
and Media Settings into tabs; media settings include a size limit, allowed
file categories and storage provider. Bellav's admin guide distinguishes user
groups (org teams, with membership management) from roles and permissions, and
lists profile and media as separate admin modules. Platform documentation
records validating MIME type and size at upload and storing media in R2.
Upload rules are a platform-wide policy for tenant uploads. The project has
already chosen Cloudflare R2 as its storage provider (ADR 0018); the reference
provider selector must not be carried over. The upload page governs file types
and size, while enforcement remains server-side before signing and after
upload. Do not copy source code or copy-specific branding.

The exact allowed file types and maximum size have not been chosen; settle
those defaults in the Phase 3 brief. Future phase briefs are written when the
prior phase closes, per `spec/phases/README.md`; do not create phases 3–5 briefs
early. Phase 1 task 1.13 and the roadmap/operations/module specs now record the
confirmed destinations.

## 2026-10-27 — Database backup and migrate in the admin panel

1. `/admin` gets a Database page (ROOT only) with exactly two tools: back up
   the database and apply pending migrations. No restore in the panel, no
   per-tenant snapshot, no schedule yet. Reference projects are studied for
   their logic only, never their code → [ADR 0023](../../spec/adr/0023-database-backup-and-migrate-from-admin.md).
2. Backups go to R2 (`platform-backups/`) and download through a short-lived
   signed link; manual for now, nightly only after a restore has been
   rehearsed.
3. Migrate works in every environment, production included, behind a typed
   confirmation, a lock and an automatic backup first.

## 2026-10-27 — Use the stable features of the installed Next.js

The owner asked for the best stable features of the current Next.js (16.4)
wherever they help. Adopted: typed routes, `error.tsx` boundaries with
`retry()`, `loading.tsx` skeletons, React view transitions for the skeleton
reveal → `.agents/rules/nextjs-react.md`. Not adopted without the owner's
decisions: Cache Components and Partial Prefetching (a migration of every
route, which the Next docs say needs per-route decisions), React Compiler (a
new dependency), anything marked experimental (`authInterrupts`,
`useOffline`).
The Cache Components and Partial Prefetching plan is
[ADR 0022](../../spec/adr/0022-cache-components-and-partial-prefetching.md)
(accepted 2026-10-27): all four steps, one PR each; tenant settings may be
cached on the server keyed by tenant id; the session is not cached in the
browser; the navigation overlay goes once prefetching covers it. Step 1
(unblock) done 2026-10-27. Step 2 (settings caches) done 2026-10-27. From then on the owner wants
all work on `main`: steps 3 and 4 land there directly, not as one PR each.

## 2026-10-27 — Empty lists are a block of their own; every page loads as a skeleton

1. **An empty list is not drawn as a table.** No header row, no pagination,
   no empty table frame: one standalone `EmptyState` block (bordered, dashed)
   in the place of the table. With nothing yet, the toolbar goes too (searching
   an empty list is pointless) and the block carries the next step. With a
   search or filter active, the toolbar stays so it can be changed, and the
   block says "no results" with "Clear filters" → `DataTable`, UI rules.
2. **Every app page shows a skeleton while it loads**, the same component
   everywhere (`PageSkeleton`, `src/components/layout/page-skeleton.tsx`) in
   the page's `loading.tsx`, shaped like the page (list, form, cards). Every
   page segment under `/dashboard` and `/admin` has its own `loading.tsx`,
   because a parent boundary does not show for navigations between siblings.
   Pages inside a section layout (settings, account) skeleton only the content:
   the title and the vertical tabs stay → UI rules "Waiting for data".

## 2026-10-27 — Loading and empty states, everywhere the same

1. **While data loads, show it the same way everywhere**, three cases:
   - a page or a section waiting for its data → a skeleton of its layout
     (stock `Skeleton`), not a spinner in every field;
   - one field fetching its own data (options, search, an availability check)
     → a spinner inside that field, `aria-busy`, the field disabled until it
     can be used (`OptionSelect` / `SearchableSelect` `loading`, the DataTable
     search);
   - a form being saved → its fields locked and the spinner only in the submit
     button.
   → UI rules "Waiting for data".
2. **Every empty block looks the same**: icon, title, one sentence, and the
   next step when there is one (`EmptyState` on the stock shadcn `Empty`). A
   list distinguishes "nothing yet" (its own state) from "no results" (the
   DataTable's, with "Clear filters") → `src/components/layout/empty-state.tsx`,
   `DataTable` `empty` prop (required), UI rules.

## 2026-10-27 — Searchable selects, loading fields, consistent language files

1. **Long selects have search**: every list is picked through `OptionSelect`
   (`src/components/form/option-select.tsx`), which is the stock Select up to 8
   options and the searchable `SearchableSelect` (shadcn Popover + Command) from
   9 on → UI rules, `tests/unit/ui-consistency.test.ts` (no raw `Select`
   outside `components/form`).
2. **A field waiting for data shows a loading icon**: `OptionSelect` /
   `SearchableSelect` take `loading` (spinner, `aria-busy`); the table search
   shows a spinner while results load → UI rules.
3. **Language files are always consistent**: every file in `src/locales/` has
   exactly the keys of `en.json`, translated, no missing and no stale keys →
   `tests/unit/i18n/messages.test.ts` ("every locale has the same keys").

## 2026-10-27 — Standard shadcn templates

- **Build on standard shadcn/ui templates, not a home-made design system.**
  References given by the owner: Studio Admin (arhamkhnz/next-shadcn-admin-dashboard,
  MIT, same stack: Next 16, TanStack Table 9, React Hook Form, Zod, Zustand),
  e.g. its `/auth/v2/login` and `/dashboard/invoice`; and shadcnuikit.com, which
  is a paid kit whose premium parts may not be used in an open-source project
  (only with a purchased license and a closed-source repository, so not here:
  this repository is MIT). Chosen: the full app shell from Studio Admin, copied
  with attribution → ADR 0021 (plan and status).

## 2026-10-27 — UI, components and system settings

1. **One library per job**: shadcn/ui, React Hook Form + Zod for every form,
   TanStack Query for browser-side data, Zustand for shared UI state, TanStack
   Table for every list, Prisma, Better Auth, own authorization rules, Vitest,
   Playwright, ESLint + Prettier → ADR 0020 (with the list of forms still to
   move), AGENTS.md "One library per job".
2. **Everything consistent; the best component everywhere.** Fields share one
   size scale, a select never puts its arrow against the border, a button
  beside a field has the same height; avoid nesting cards/surface containers
  (for example on `/dashboard/account/notifications`) unless the inner surface
  has a clear functional reason; long or database-backed selects need search,
  with remote options loaded through an API to avoid fetching the full dataset;
  fields waiting for asynchronous data need a visible loading state; select
  menus should open offset from the trigger instead of covering it →
  `.agents/rules/ui-accessibility.md`,
   `src/components/ui/field.ts`, `tests/unit/ui-consistency.test.ts`.
3. **Vertical tabs, not horizontal**, for the sub-pages of a section →
   `SectionNav` / `SectionLayout` in `src/components/ui/section-nav.tsx`.
4. **Every table has pagination, search, filters, bulk ("mass") actions and an
   actions column; edit quickly in a drawer** → `src/components/data-table/`,
   ADR 0020, UI rules.
5. **System configuration** (rows per page, date and time, time zone,
   language, sign-ups), some settings ROOT only → Admin → Settings,
   `src/platform/settings/registry.ts` (`PlatformSwitch`, spec/04 "Platform
   switches").
6. **Prettier owns formatting**; the repository was formatted once →
   `.prettierrc.json`, `pnpm format`, `pnpm lint`.

## 2026-10-26 — Codebase rules, roles and account pages

1. **Prisma 7 removed entirely**; only Prisma ORM 8 (`db8`), no compatibility
   layer → AGENTS.md "Prisma 8 only", lint rules in `eslint.config.mjs`.
2. **ROOT above ADMIN.** ROOT has authority over the whole system, ADMIN only
   inside tenants; the owner's account is ROOT through `ROOT_EMAILS` in the
   environment, never in code → ADR 0014, `src/lib/roles.ts`; the admin panel
   is ROOT only (proxy, `(admin)/layout.tsx`).
3. **Switch As** so developers can move between kinds of member to test
   quickly → ADR 0015, `switchAs` plugin in `src/auth.ts`.
4. **UUID v7, NanoID and CUID2, each where it fits** → ADR 0013,
   `src/lib/ids.ts`, lint.
5. **No `../` imports; `@/` everywhere** → lint (`#src/`, `#scripts/` in plain
   Node scripts, `@tests/` for test helpers).
6. **Settings is a full page, not a modal, with every sub-page** (General,
   Security, Backup, Logs). Backup and Logs cover each user's own data →
   `src/lib/settings-pages.ts`, `src/lib/account-export.ts`,
   `src/lib/account-log.ts`.
7. **All tests live in `tests/`**, not beside the code → ADR 0016,
   `tests/unit/repo-layout.test.ts`.
8. **Remember everything in the shared AI memory, and record every error an
   agent fixes** → this file and `lessons.md` (see README).
9. **Third-party agent skill packs** (obra/superpowers, generic "agent skills /
   workflows / architecture rules" collections): asked about, not added to the
   repository. Their useful ideas go into `.agents/rules/` in this project's own
   words; vendor skills pinned to installed versions (like `prisma-8`) are the
   exception.

## 2026-10-26 — Operations and scale posture (applies to every phase)

Set by the owner for the whole platform build:

1. **Free services first, paid-ready.** Start every dependency on a free tier
   behind a wrapper, and name the load at which we pay →
   [spec/16-operations.md](../../spec/16-operations.md) cost ladder.
2. **Detailed error management.** Errors must answer what/where/which
   tenant/which request when the system is large → operations doc "Errors",
   ADR 0017, `ErrorReport`, request ids.
3. **Managed logs, caches, queues, email.** Everything operational is a row
   with a console page, not a log stream → operations doc "The ops pages".
4. **Backup and restore at every level, including one account** → operations
   doc "Backup and restore" (`TenantSnapshot`, restore-to-new).
5. **Load-balancing and data-contention ready** → operations doc "Contention"
   (stateless instances, `SKIP LOCKED`, idempotency, no in-memory authority).
6. **Ready for thousands of customers** → operations doc "Scale targets",
   phase-8 load test.
7. **2FA, layered security, managed sessions** → spec/10-security-compliance.md
   "Sign-in, sessions and two-factor" (TOTP + backup codes exist; 2FA required
   for platform staff; per-device session revocation).
8. **Multiple sign-in methods** → same section (password, magic link, OAuth,
   dev/demo gated; passkeys later).
9. **No emoji** in code, comments, copy, docs or commits → AGENTS.md §5 and
   spec/13-conventions.md.
10. **Every ops surface is a page** (backups, settings, logs, email templates,
    config) → operations doc "The ops pages" table with its phase.
11. **Learn features, not code** from `vnbca.org`, `bellav-2026`,
    `platform.madelab.io` → operations doc "What the reference projects
    taught us".
12. **Document before building; always know what is done and what is not** →
    spec/README.md "How progress is tracked" (brief checkboxes → brief status
    → roadmap status; no second list).
13. **Record fixed errors** → the existing lessons rule in this directory's
    README; restated here because the owner asked for it explicitly.

## 2026-10-26 — Infrastructure decisions

- **Cloudflare R2 is the object store** → ADR 0018 accepted.
- **Dev and preview on Vercel; production is intended for DigitalOcean** →
  spec/14 "Production host" and the phase-3 blocker in the roadmap. Keep the
  app portable (standalone build, no Vercel-only APIs in owned paths); the
  tenant custom-domains mechanism is what a non-Vercel host must replace.
