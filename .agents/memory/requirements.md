# Owner requirements

Standing requirements from the owner, newest first. Each entry says where the
requirement is specified so agents read the source, not this summary. When a
requirement becomes spec, ADR, rule or test, the pointer is updated and this
file stays the index — not the place requirements are defined.

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
  has a clear functional reason → `.agents/rules/ui-accessibility.md`,
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
