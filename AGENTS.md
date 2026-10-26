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

**Pure logic goes in `src/lib` with a `.test.ts` beside it.** If a rule can be
stated as a function, state it as a function: components render, they do not
decide.

**The server is the authority.** Client-side validation buys the user a round
trip they do not have to wait for. It proves nothing. A server action re-parses
what arrives, every time, even when a form checked it first.

**Structured data comes from the same source as what the page shows.** A price,
a breadcrumb, an outline: build both from one value. Two copies of the same
fact drift, and the copy nobody looks at drifts first.

**Do not reformat.** There is no formatter here on purpose. Match the style of
the file you are in.

**Every `docs/x.md` has a `docs/x.it.md`.** A guide added in one language only
is a guide half the readers cannot use.

**Images and videos in the docs live in `public/media/`**, written as Markdown
images relative to the guide: `![What it shows](../public/media/file.webp "Caption")`
from `docs/`, `../../public/media/...` from `content/docs/`.
That one path works on GitHub, on the site and in every clone. A clip that
loops goes in as an animated WebP; an `.mp4` gets player controls on the site
and shows broken on GitHub. Add `file.dark.webp` next to an image for dark
mode. See `src/components/docs/doc-media.tsx`.

# How to work

These hold for every agent and every task, in Claude Code, Cursor, Codex and
Devin alike.

1. **Read before you write.** Open the files you will change and the ones that
   call them. Find the existing pattern and follow it.
2. **Plan, then act.** For anything beyond a one-line fix, state in a few lines
   what you will change and why. If the request can be read two ways, name both
   and ask instead of picking one silently.
3. **Smallest change that solves the problem.** No speculative abstractions, no
   options nobody asked for, no "while I was here" refactors.
4. **Surgical diffs.** Do not rename, reorder, reformat or re-comment code the
   task does not need. Every changed line traces back to the request.
5. **Make done checkable.** Turn the task into something you can verify (a test
   that fails before and passes after, a command that exits 0) and loop until
   it holds.
6. **Never guess an API.** Next.js, React, Prisma, Better Auth, Stripe and Zod
   here are newer than most training data. Read the installed types or docs in
   `node_modules/` first.
7. **Report honestly.** Say what you changed, how you verified it, and what you
   skipped or noticed out of scope. Never claim a check passed without running it.

# Project map

| Path | What lives there |
| --- | --- |
| `src/app/` | App Router. `(auth)`, `(dashboard)`, `(admin)` are route groups; `[locale]` holds the translated public pages and docs |
| `src/app/actions/` | Server actions, one file per domain, tests beside them |
| `src/app/api/` | Route handlers: auth, billing, checkout, webhooks, cron, health |
| `src/components/ui/` | Base primitives (Radix + Tailwind). Reuse before writing one |
| `src/components/<area>/` | Feature components by area |
| `src/lib/` | Pure logic and server utilities, each with a `.test.ts` |
| `src/lib/schemas/` | Zod schemas shared by forms and server actions |
| `src/lib/auth/` | The session boundary: `getCurrentUser`, `requireUser` |
| `src/config/` | Site, brand and kit configuration |
| `src/i18n/`, `src/locales/` | next-intl setup; `en.json` is the source of every message |
| `prisma/` | Schema, migrations, seeds |
| `docs/`, `content/docs/` | Guides, each in English and Italian |
| `e2e/` | Playwright end-to-end and accessibility specs |

# Topic rules

Before working in an area, read its rule file in `.agents/rules/`. They are short.

| When you touch | Read |
| --- | --- |
| Pages, layouts, components, server actions, route handlers | `.agents/rules/nextjs-react.md` |
| Any TypeScript | `.agents/rules/typescript.md` |
| `prisma/` or any database query | `.agents/rules/database.md` |
| Auth, billing, webhooks, admin, user input, secrets | `.agents/rules/security.md` |
| Tests, or code that needs them | `.agents/rules/testing.md` |
| Styles, `src/components/`, anything visible | `.agents/rules/ui-accessibility.md` |
| Commits, `CHANGELOG.md`, releases | `.agents/rules/git-changelog.md` |

The nine rules above come first. If a topic rule disagrees with them, follow the
nine and point out the conflict.

# Commands

```bash
npm run dev                 # local server
npx tsc --noEmit            # type-check
npm run lint                # ESLint
npm test                    # Vitest unit tests
npm run test:e2e            # Playwright
npm run check:translations  # translated docs in step with their source
npx prisma migrate dev --name <change>   # after editing schema.prisma
```

Use the package manager whose lockfile is committed. Never add a second lockfile.

# Definition of done

Run these, do not assume them:

- `npx tsc --noEmit`, `npm run lint` and `npm test` pass.
- New logic and every bug fix come with a test.
- `npm run check:translations` passes if you touched `docs/` or `content/docs/`.
- User-visible changes have a `CHANGELOG.md` entry; changes an adopter must act
  on are also in `docs/upgrading.md` and its translation.
- The diff holds only what the task needed: no secrets, no `.env`, no debug logs.
