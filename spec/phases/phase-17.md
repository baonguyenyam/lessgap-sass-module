# Phase 17 — Sidebar completeness and shell chrome

**Status:** done
**Roadmap:** owner request — "hoàn thiện sidebar" and the shadcn-admin / MADE conventions

## Goal
Every dashboard page has a nav item, every model a page; the shell follows
shadcn-admin (satnaing) and MADE (platform.madelab.io) conventions — tenant
dropdown in the sidebar header, collapsible submenus, top-right chrome of
search/language/theme/account, groups by business domain.

## Tasks

### 16.1 — Nav items for pages that existed without them
- [x] done (`7665115` — payments, quotes)

### 16.2 — Locations page
- [x] done (`ce144e7` — list + `createLocation`)

### 16.3 — Intake page
- [x] done (`7f0d5f1` — contact-only forms + responses)

### 16.4 — Products page
- [x] done (`ec1c53f` — `Package`/`Membership` definitions)

### 16.5 — Waitlist page
- [x] done (`35b3439` — list + `booked`/`canceled` actions)

### 16.6 — MADE-style domain grouping
- [x] done (`5e697a8`, `de27f60` — booking/sales/customers/site/setup/workspace/account)

### 16.7 — Shell chrome
- [x] done — TenantSwitcher "Add team", `NavItem.children` + Collapsible
  settings submenu, `NavUser` header variant (icon button), search icon
  button with ⌘K tooltip (`588c921` → `0980d9b` + owner edits)

### 16.8 — Sidebar-empty root cause
- [x] done (`588c921` — `enabledModules` checked only `newsletter`)

## Findings
- `cacheTag()` throws outside Cache Components contexts — settings stores
  wrap it so reads still work (Better Auth routes read settings).
- `getTranslations` throws in Better Auth hook contexts — `emailStrings`
  tries it first and falls back to reading `en.email` directly.
