# 0005. Themes are code in the repository

**Status:** accepted
**Date:** 2026-10-26

## Context
We sell custom design per business, done by our designers. Owners should edit
content, not layout. Free tenants share templates.

## Decision
A theme is a folder of React Server Components with a typed manifest, token
schema and section registry, registered by key. Custom themes extend a
shared theme. Themes receive typed `SiteData` and use module site components
for anything interactive. Tenant-specific design values are tokens and
section config in the database, validated by the theme's schemas.

## Consequences
- Every design change is reviewed, type-checked and tested like any code.
- No tenant-authored HTML or script ever runs on our origin.
- A new custom theme is a deploy, not a setting. That matches how we sell it.
- The repository grows with custom themes; if it passes ~100 custom themes,
  revisit (separate package, or a section library with richer config).

## Options considered
- **Visual page builder with stored layout JSON:** a large product of its own;
  owners would break designs; testing every layout is impossible.
- **Stored HTML/CSS per tenant:** XSS surface on our origin, no type safety, no reuse of booking or shop components.
- **Separate Next.js project per custom client:** what we are moving away from.
