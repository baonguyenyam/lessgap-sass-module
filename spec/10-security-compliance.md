# Security and compliance

**Status:** `draft`. Not legal advice; confirm the compliance points with counsel before launch.

## Threats we design against

| Threat | Control |
| --- | --- |
| Tenant A reads or changes tenant B's data | scoped client, RLS, CI audit, isolation tests ([tenancy.md](./02-tenancy.md)) |
| Guessing ids in URLs | cuid ids; ownership checked by scope; 404 for other tenants' records |
| Cookie tossing between tenant sites and the dashboard | separate apex for sites, PSL entry, `__Host-` cookies ([domains.md](./03-domains.md)) |
| Domain takeover after a tenant leaves | remove the domain from Vercel when the row goes; daily job reconciles Vercel's list with ours |
| Stolen staff session used across tenants | every request re-checks membership for the slug in the URL |
| Abuse of public forms, booking and chat | rate limits per IP and per tenant, Turnstile on high-volume forms, limits per plan |
| Prompt injection in tenant content | content is data; tools enforce rules, not the model ([chatbot-rag.md](./08-chatbot-rag.md)) |
| Platform staff misuse | least-privilege platform roles, reasons and audit log for impersonation and overrides |
| Webhook forgery | signature verification for Stripe billing, Stripe Connect, Resend, Twilio; idempotency keys |
| Secret leakage | secrets only in env, validated in `src/lib/env.ts`; no secret in `NEXT_PUBLIC_*` |

## Sign-in, sessions and two-factor

People can sign in several ways; every way lands in the same session model
and the same account rules.

| Method | Where configured | Notes |
| --- | --- | --- |
| Email + password | always on | bcrypt (kept from the kit so existing hashes still verify), 8–72 chars |
| Magic link | when email is configured | rate-limited — it spends outbound email |
| OAuth: Google, GitHub | `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*` env pairs | only providers with both keys are registered |
| Dev sign-in | `NODE_ENV=development` only | one click, no credential; the check is the environment, not the import |
| Demo sign-in | `DEMO_MODE=true` only | shared fixture account; cannot enable 2FA |
| Switch As | ROOT only | staff session as another account, reason + audit, 60-minute cap ([ADR 0015](./adr/0015-switch-as.md)) |
| Passkeys | not yet | "later" in the roadmap; Better Auth plugin exists |

- **Two-factor.** TOTP (authenticator app) plus one-time backup codes. Optional
  for members today; **required for anyone with a `platformRole`** — the
  platform console refuses a staff session without `twoFactorEnabled`, and
  the requirement is enforced server-side, not by hiding UI. Turning 2FA off
  for a staff account removes console access until it is on again.
- **Automatic OAuth linking** is refused for accounts with 2FA on unless the
  request carries that account's own session — otherwise a Google account
  with your address becomes a door around your authenticator (implemented in
  `validateUserInfo`, `src/lib/account-linking.ts`).
- **Sessions** are database rows: revocable per device in Settings →
  Security, carrying `ipAddress` and `userAgent`. The 60-second cookie cache
  is the bound on how long a revoked session can still answer.
  `revokeSessionsOnPasswordReset` ends every other session on a password
  reset. Switch-As sessions expire after 60 minutes and cannot be extended.
- **Email change** is a two-hop confirmation: the current address approves
  first, the new address verifies second.
- **Rate limits** sit on sign-in, sign-up, magic link, password reset and
  public forms; the store upgrades from per-instance memory to shared Upstash
  when `UPSTASH_REDIS_REST_*` is set ([operations](./16-operations.md)).

## Health information (dental, clinics, spas)

A dental office in the US is a HIPAA covered entity. If our platform creates,
receives or stores protected health information for them, we become their
business associate and need a business associate agreement, plus HIPAA
safeguards, plus BAAs with our own vendors (database, hosting, email, SMS,
LLM).

**Decision for v1: we do not handle PHI.**

- Booking for the `dental` vertical collects name, contact, preferred time
  and a reason chosen from a short neutral list ("check-up", "cleaning",
  "consultation", "other"). No free-text medical notes, no insurance ids, no
  intake forms, no uploads.
- The chatbot prompt for `dental` refuses clinical questions and points to the phone.
- The site and dashboard copy for that vertical say not to send medical
  information through the site.
- Intake forms, insurance details or patient portals are a separate product
  decision that requires a compliance review first (logged as an open question in the roadmap).

## Payments (PCI)

Card data never touches our servers: Stripe Checkout or Stripe Elements only.
That keeps us and our tenants on the lightest PCI self-assessment.

## SMS (TCPA, carrier rules)

- Send SMS only to customers who gave explicit consent, recorded with time,
  source and the exact wording shown.
- Every first message identifies the business; STOP and HELP are honoured
  automatically; opt-outs are stored per tenant and per phone number.
- US numbers used for application messages need A2P 10DLC registration; plan
  for it before phase 5 ships SMS.
- Quiet hours by the customer's time zone for non-urgent messages.

## Email (CAN-SPAM)

Transactional email (booking confirmations, receipts) needs no marketing
consent. Marketing email does, with the tenant's physical address and a
one-click unsubscribe, as the kit's newsletter already does.

## Accessibility (ADA)

Tenant sites are public accommodations' websites; accessibility complaints
against small businesses are common in the US. Every theme meets WCAG 2.1 AA
on its fixture site in CI (axe in Playwright, already in the kit), and the
dashboard requires alt text before an image can be published.

## Privacy

- A privacy policy and terms per site, generated from tenant settings with a
  template we maintain, editable by the tenant.
- Customer data export and deletion per tenant (see `customers` module).
- State privacy laws (for example Texas TDPSA, California CCPA/CPRA) may apply
  to the platform as a processor for larger tenants; data processing terms
  are part of the tenant agreement.

## Data retention

| Data | Kept |
| --- | --- |
| Tenant business data | while the tenant is active, 30 days after cancelation |
| A module's data after the owner deletes it | 7-day grace period, then deleted; gone from backups when they expire |
| Module data exports | 7 days, then the file is deleted |
| Chat conversations | 90 days default, tenant-configurable down to 0 |
| Notification logs | 1 year |
| Audit log | 2 years |
| Platform invoices | as tax law requires |
