# 0020. One library per job: the application stack

**Status:** accepted (set by the product owner, 2026-10-27)
**Date:** 2026-10-27

## Context
The product owner fixed the library for each job so every page, form and
list is built the same way. Several were missing (TanStack Query, Zustand,
Prettier) or installed and unused (React Hook Form), and AGENTS.md said there
was deliberately no formatter.

## Decision

| Job | Library | How it is used here |
| --- | --- | --- |
| UI components | shadcn/ui on Radix (`src/components/ui/`) | Every screen builds on these; fields share one size scale (`src/components/ui/field.ts`) |
| Forms | React Hook Form + `@hookform/resolvers/zod` | Every form; the schema lives in `src/lib/schemas/` |
| Validation | Zod | The same schema runs in the browser and again in the server action, which stays the authority |
| Server state | TanStack Query | Data fetched or mutated **in the browser**: drawers loading a record, polling, optimistic updates, invalidation. Pages read on the server (Server Components); lists keep their state in the URL |
| Client state | Zustand (`src/stores/`) | UI state shared between components (open drawer, selection carried across components). Local state stays in `useState` |
| Data tables | TanStack Table v9 (`src/components/data-table/`) | Every list: search, filters, sort, pagination, bulk actions, row actions, edit in a drawer |
| Database | Prisma ORM 8 (`db8`) | See `.agents/rules/database.md` |
| Authentication | Better Auth, behind `@/lib/auth` | See AGENTS.md |
| Authorization | Our own rules: `src/lib/roles.ts` (system roles), `src/platform/tenancy/permissions.ts` (tenant roles) | Checked on the server for every action |
| Unit tests | Vitest (`tests/unit/`) | ADR 0016 |
| End-to-end | Playwright (`tests/e2e/`) | ADR 0016 |
| Code quality | ESLint + Prettier | Prettier owns formatting; `pnpm lint` checks both |

## Consequences
- AGENTS.md's "Do not reformat, there is no formatter" becomes "Prettier owns
  formatting"; the repository was formatted once, in its own commit.
- Existing forms move to React Hook Form area by area; until each is moved
  it keeps working as a plain server-action form.
- Adding a second library for one of these jobs (another table, form or
  state library) needs a new ADR.

## Options considered
- **All data through TanStack Query:** every page would need a JSON endpoint
  and would paint only after a client fetch; Server Components already read on
  the server without one.
- **Prettier only on changed files:** no large diff now, but the repository
  would stay half-formatted for years.

## Migration status (2026-10-27)

Done: every list is a `DataTable` (admin users, admin newsletter, projects,
members, roles, billing invoices); every drawer form (`FormDrawer`) and the
platform settings forms use React Hook Form + Zod; TanStack Query runs every
browser-side mutation of those; Zustand holds the drawer state; Prettier
formats the repository and `pnpm lint` checks it.

Still plain server-action forms, to move to React Hook Form area by area
(button-only forms such as sign out, dismiss, end session and switch back need
no form library):

- [ ] Auth: `src/app/(auth)/login`, `signup`, `forgot-password`, `reset-password`, `2fa`
- [ ] Settings → Security: change email, set/change password (`settings/security/page.tsx`), `two-factor-card.tsx`
- [ ] Settings → General: `profile-form.tsx`, `delete-account.tsx`
- [ ] Project detail: `project-edit-form.tsx`
- [ ] Public site: `contact-form.tsx`, `waitlist-form.tsx`, `footer-signup.tsx`
