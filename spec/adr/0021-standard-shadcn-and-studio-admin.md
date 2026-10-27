# 0021. Standard shadcn/ui components and the Studio Admin app shell

**Status:** accepted (requested by the product owner, 2026-10-27)
**Date:** 2026-10-27

## Context
The owner wants the app built on standard shadcn templates rather than a
home-made design system, and pointed at Studio Admin
(github.com/arhamkhnz/next-shadcn-admin-dashboard, MIT, Next 16, React 19,
TanStack Table 9, React Hook Form, Zod, Zustand: the same stack as ADR 0020)
and at shadcnuikit.com. shadcnuikit's premium components may not be used in an
open-source project, and this repository is MIT, so it is out; Studio Admin is
the source.

Our `src/components/ui/` had drifted from shadcn: our own variants (`primary`,
`gradient`, `outline-primary`), our own sizes (`md`, `xl`), a `loading` prop on
Button, and a home-made field size scale.

## Decision
- **`src/components/ui/` holds stock shadcn components** ("radix-nova" style,
  the unified `radix-ui` package), copied from Studio Admin with attribution in
  `NOTICE`. They are edited only to point `cn` at `@/lib/utils`. Our own
  building blocks (DataTable, FormDrawer, SectionNav) live outside `ui/`.
- **The app shell is Studio Admin's**: the shadcn `Sidebar` (collapsible to
  icons, a sheet on phones), a header with search, theme and the user menu,
  and the split-screen auth layout (`/auth/v2`) for the sign-in pages.
- **Brought in by copying with attribution**, adapted to our routes, roles,
  translations and DataTable. No runtime dependency on their repository.
- **The public marketing site keeps its own look**; it may keep two marketing
  extensions on Button (the `gradient` variant and the `xl` size), marked as such.
- Stock sizes replace our field scale: every control is the shadcn default
  height unless a stock size says otherwise.

## Plan
- [x] 1. Stock shadcn primitives in `src/components/ui/`; call sites moved to stock variants and sizes
- [x] 2. App shell: sidebar and header for the dashboard and the admin panel
- [x] 3. Auth pages on the split-screen layout
- [ ] 4. Studio Admin's data-table look for `DataTable` (toolbar, column visibility, pagination)

## Consequences
- Upgrading a component is `npx shadcn add <name>` plus the `cn` import fix.
- The marketing pages and the app no longer share one button style.
- `NOTICE` carries Studio Admin's MIT copyright line.
