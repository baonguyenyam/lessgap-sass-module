# 0028. Intake forms need a HIPAA decision first

**Status:** accepted (implemented — see phase briefs 13–15)
**Date:** 2026-10-29

## Context

The roadmap's "Later" list's patient intake forms (dental vertical) store
PHI — names, dates, conditions. HIPAA applies to covered entities; the
kit's hosting (Neon + Vercel + R2) has no BAA; storing PHI without one is a
compliance problem, not a schema problem. The `dental` vertical already
skips PHI fields in the chatbot (task 7.4's guard) — intake forms put the
same data in a `FormResponse` row.

## Decision

Deferred — intake forms wait for a hosting decision: either a BAA-capable
stack (Neon's paid tiers, a BAA-capable R2, a HIPAA-reviewed stack) or a
no-PHI scope (forms for contact/preferences only, no conditions). The
`dental` vertical's PHI guard (chatbot) stays as the interim answer.

## Consequences

The `dental` preset's intake row stays open; an implementation before the
BAA lands writes PHI into a stack that can't hold it. The
"contact-preferences-only" variant is implementable without the BAA — it
would be its own task, scoped to non-PHI fields.
