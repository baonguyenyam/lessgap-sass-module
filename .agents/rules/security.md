# Security

Applies to auth, billing, webhooks, admin, and anything that accepts input.
Based on the OWASP Top 10; each line maps to a class of defect.

- **Access control (A01).** Check authentication and authorisation on the server,
  in every action and route handler, even if the UI hides the button. Admin-only
  code checks the role server-side. Load-then-compare ownership for every id.
- **Secrets (A02).** Never commit `.env` or a real key. New variables go in
  `.env.example` (empty value, with a comment) and in the validation in
  `src/lib/env.ts`. Never log tokens, passwords, session ids or full emails.
  Only `NEXT_PUBLIC_*` reaches the browser, so nothing secret gets that prefix.
- **Injection (A03).** Prisma parameterises; keep it that way (see database rules).
  `dangerouslySetInnerHTML` only for content built by our own code
  (`jsonLdScript`, generated SVG); never for user input.
- **Design (A04).** Validate with Zod on the server, every time. Rate-limit
  anything that sends email, checks a password or a code: use `checkRateLimit`
  from `src/lib/rate-limit.ts`.
- **Misconfiguration (A05).** A half-configured integration must fail at boot
  (`src/lib/env.ts`), not on the first request.
- **Dependencies (A06).** Do not add a dependency for what a few lines can do.
  If you add one, say why. CI runs `npm audit --omit=dev --audit-level=high`.
- **Authentication (A07).** Go through `@/lib/auth` and Better Auth; never roll
  your own session, token or password hashing.
- **Integrity (A08).** Verify webhook signatures before reading the event.
  Make webhook handlers idempotent: the same event may arrive twice.
- **Logging (A09).** Errors returned to users are generic and translated; details
  stay on the server.
- **SSRF / redirects (A10).** Never fetch or redirect to a URL taken from input
  without checking it against an allow-list or requiring a relative path.

Order matters in destructive flows: run every check that can refuse *before*
touching an external system (Stripe, email), so a refusal leaves nothing half done.

---

Based on: the [OWASP Top 10 (2021)](https://owasp.org/Top10/) and the OWASP Cheat Sheet Series.
