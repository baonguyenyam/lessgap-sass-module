<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in this repository

Nine rules. Each one is here because breaking it has caused, or would cause, a
defect that nothing else catches.

**Read the session through `@/lib/auth`.** `getCurrentUser()` returns the user
or null, `requireUser()` returns it or redirects. Do not import `auth()` from
`@/auth`: that boundary is what made the move to Better Auth in 2.0 a change
to seven files instead of a rewrite, and code written against the library
directly is code that has to be found and rewritten the next time. The sign-in
flow, the route handler and the middleware are the exceptions, and they are
already written.

**User-facing text lives in `src/locales/en.json`.** Read it with
`useTranslations` or `getTranslations`. A test fails on a key nothing reads and
on a key read but missing, so those two mistakes cannot survive. It cannot see a
string typed straight into a component, which is exactly how one gets out: if
you are about to write words a person will read, they belong in the message
file.

**The kit is neutral.** No brand name, no positioning, no marketing copy in the
product. Whoever deploys this ships it to their own users, and a sentence about
the kit inside their app is your words in their mouth. Anything specific to a
deployment goes in environment variables.

**English everywhere**, including comments, test names and error strings.

**Pure logic goes in `src/lib` with a test in `tests/unit/`.** The test mirrors
the path: `src/lib/ids.ts` → `tests/unit/lib/ids.test.ts`. If a rule can be
stated as a function, state it as a function: components render, they do not
decide.

**The server is the authority.** Client-side validation buys the user a round
trip they do not have to wait for. It proves nothing. A server action re-parses
what arrives, every time, even when a form checked it first.

**Structured data comes from the same source as what the page shows.** A price,
a breadcrumb, an outline: build both from one value. Two copies of the same
fact drift, and the copy nobody looks at drifts first.

**One library per job** ([ADR 0020](spec/adr/0020-application-stack.md)):
shadcn/ui components, React Hook Form + Zod for every form, TanStack Query for
data fetched in the browser, Zustand for shared UI state, TanStack Table for
every list, Prisma 8, Better Auth, Vitest, Playwright. Prettier owns
formatting: run `pnpm format` and never hand-format against it.

# How to work

The four principles below are copied verbatim from
[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)
(MIT, commit `2c60614`, based on Andrej Karpathy's notes on LLM coding
mistakes). Keep them verbatim so they can be updated from upstream; put
anything specific to this project in section 5.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. In this project

- **Read before you write.** Open the files you will change and the ones that
  call them, and follow the pattern already there.
- **Never guess an API.** Next.js, React, Prisma, Better Auth, Stripe and Zod
  here are newer than most training data. Read the installed types or docs in
  `node_modules/` first.
- **Report honestly.** Say what you changed, how you verified it, and what you
  skipped or noticed out of scope. Never claim a check passed without running it.
- **No emoji** anywhere: code, comments, UI copy, docs, test names, commit
  messages. Icons come from the icon component, not Unicode.

# Project memory

`.agents/memory/` is the memory every agent shares here, whatever the tool.

- **At the start of every task, read `.agents/memory/lessons.md`.** It lists
  mistakes already made in this repository and the rule that prevents each.
- **When you fix an error** that took more than one attempt, or came from a
  wrong assumption about a tool, a library or this codebase, add a lesson to
  that file in the same change (format in `.agents/memory/README.md`). When a
  lesson becomes a standing rule, move it into these rules, a lint rule or a
  test, and leave a one-line pointer.
- Never put secrets, personal data or real database hostnames in it.

# Project map

| Path | What lives there |
| --- | --- |
| `src/app/` | App Router. `(auth)`, `(dashboard)`, `(admin)` are route groups; `[locale]` holds the public pages |
| `src/app/actions/` | Server actions, one file per domain (tests in `tests/unit/app/actions/`) |
| `src/app/api/` | Route handlers: auth, billing, checkout, webhooks, cron, health |
| `src/components/ui/` | Base primitives (Radix + Tailwind). Reuse before writing one |
| `src/components/<area>/` | Feature components by area |
| `src/lib/` | Pure logic and server utilities, each with a test in `tests/unit/lib/` |
| `src/lib/schemas/` | Zod schemas shared by forms and server actions |
| `src/lib/auth/` | The session boundary: `getCurrentUser`, `requireUser` |
| `src/config/` | Site, brand and kit configuration |
| `src/i18n/`, `src/locales/` | next-intl setup; `en.json` is the source of every message |
| `prisma/` | Schema, migrations, seeds |
| `tests/` | Every test ([ADR 0016](spec/adr/0016-tests-live-in-tests.md)): `unit/` mirrors `src/` (and `unit/scripts/`), `e2e/` Playwright and axe, `helpers/` shared doubles (`@tests/helpers/db8-mock`), `integration/` from phase 0 |
| `spec/` | The platform plan: architecture, tenancy, modules, phases, ADRs |
| `src/platform/` | Platform core: tenancy, entitlements, switches, domains, audit, jobs (from phase 0) |
| `src/modules/<module>/` | One folder per business module, same shape for all (from phase 1) |
| `src/themes/<themeKey>/` | Site themes, registered by key (from phase 3) |
| `src/verticals/` | Industry presets applied at onboarding (from phase 4) |

# Topic rules

Before working in an area, read its rule file in `.agents/rules/`. They are short.

| When you touch | Read |
| --- | --- |
| Pages, layouts, components, server actions, route handlers | `.agents/rules/nextjs-react.md` |
| Any TypeScript | `.agents/rules/typescript.md` |
| `prisma/` or any database query | `.agents/rules/database.md` |
| `src/platform/`, tenant data, dashboard, sites | `.agents/rules/multi-tenancy.md` |
| `src/modules/`, entitlements, `src/themes/`, `src/verticals/` | `.agents/rules/modules.md` |
| `spec/`, phase briefs, ADRs | `spec/README.md`, `spec/phases/README.md` |
| Auth, billing, webhooks, admin, user input, secrets | `.agents/rules/security.md` |
| Tests, or code that needs them | `.agents/rules/testing.md` |
| Styles, `src/components/`, anything visible | `.agents/rules/ui-accessibility.md` |
| Commits, `CHANGELOG.md`, releases | `.agents/rules/git-changelog.md` |

The nine rules above come first. If a topic rule disagrees with them, follow the
nine and point out the conflict.

# Building the platform

This repository is becoming a multi-tenant website platform for local
businesses. The plan is in `spec/`; it is the source of truth for what to
build and how.

- **Start every platform task** by reading `spec/README.md`, then the brief of
  the current phase in `spec/phases/`, then the documents that brief links to.
  No brief for the phase yet → your task is to write it from
  `spec/phases/TEMPLATE.md`, not to write code.
- **One brief task per change.** Implement exactly one task, with the tests
  and checks it lists, and tick it in the brief in the same change. Anything
  else you notice goes under "Findings" in the brief, not into the code.
- **Before your first change in these areas, read the standard:** tests
  `spec/11-testing.md`, schema and migrations `spec/12-migrations-and-data.md`,
  errors, logging, money, time and naming `spec/13-conventions.md`, modules
  `spec/15-module-system.md`.
- **Use the glossary** (`spec/glossary.md`). One word per concept, in code, schema and UI.
- **Decisions are ADRs.** If the work needs a decision the spec does not make,
  or contradicts one it does, stop and propose an ADR in `spec/adr/` instead
  of deciding in code.
- **Spec and code move together.** A change that makes the spec untrue
  updates the spec in the same change.

# Commands

```bash
pnpm dev                    # local server
pnpm typecheck              # type-check
pnpm lint                   # ESLint
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright
pnpm db:emit                # after editing prisma/contract.prisma: regenerate src/generated/prisma8
pnpm db:plan --name <owner>_<change>   # plan a migration from the contract change
pnpm db:migrate             # apply pending migrations to the database in .env
pnpm db:status              # which migrations a database has and lacks
pnpm db:reset               # dev only: drop the database, apply every migration, run the system seed
pnpm db:reset:demo          # the same, plus the demo seed
pnpm db:adopt               # once per database Prisma 7 built: sign it at the baseline, then migrate
pnpm check:deploy           # is this database ready for this checkout?
```

**Prisma 8 only.** The project runs Prisma ORM 8 (`prisma` CLI and
`@prisma/orm-postgres`); Prisma 7 is gone: no `schema.prisma`, no
`@prisma/client`, no `prisma migrate …` commands. Before any database task, read
the `prisma-8` skill (`.claude/skills/prisma-8/`, same copy under `.agents/`,
`.cursor/`, `.devin/`): it is the reference for the installed version, and your
training data about Prisma is older than it.

- Contract (the schema): `prisma/contract.prisma`. Emitted artefacts:
  `src/generated/prisma8/` (never edit; `pnpm db:emit` rewrites them, CI fails if stale).
- Migrations: `migrations/app/<timestamp>_<owner>_<change>/`, planned with
  `pnpm db:plan`, never written by hand except the holes the planner leaves
  (data transforms). The `db` ref in `migrations/app/refs/` must point at the
  newest migration's `to` hash after every plan.
- Runtime client: `db8` from `@/lib/db8` (`db8.orm.public.<Model>`, `db8.sql`),
  everywhere. Timestamp columns are `TimestampString` text: read them with
  `toDate` and write them with `toTs` / `nowTs` from `@/lib/timestamps`, never
  `new Date(row.createdAt)` (that parses as local time). Unit tests mock it with
  `createDb8Mock()` from `@tests/helpers/db8-mock`.
- Better Auth talks to Postgres through its own Kysely pool (`src/lib/kysely.ts`),
  not through the ORM.

Use the package manager whose lockfile is committed. Never add a second lockfile.

# Definition of done

Run these, do not assume them:

- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- New logic and every bug fix come with a test.
- User-visible changes have a `CHANGELOG.md` entry.
- The diff holds only what the task needed: no secrets, no `.env`, no debug logs.
- An error you fixed along the way that could recur has a lesson in
  `.agents/memory/lessons.md`.
- Platform work: `pnpm test:integration`, `pnpm modules:check` and
  `pnpm audit:tenancy` pass once they exist (phase 0), the brief task is
  ticked, and the PR uses `.github/pull_request_template.md`.
