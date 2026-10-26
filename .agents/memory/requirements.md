# Owner requirements

Standing requirements from the owner, newest first. Each entry says where the
requirement is specified so agents read the source, not this summary. When a
requirement becomes spec, ADR, rule or test, the pointer is updated and this
file stays the index — not the place requirements are defined.

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
