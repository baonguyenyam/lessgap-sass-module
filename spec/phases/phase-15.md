# Phase 15 — intake forms (contact-only scope)

ADR 0028's scope: the no-PHI variant is implementable now — an `IntakeForm`
collects contact and preference fields a tenant asks before a visit
(preferred pronouns, notes-for-staff, consent) — never clinical data. The
`dental` vertical's PHI guard (task 7.4) stays the answer to anything
medical; this scope is explicitly contact-and-preferences.

**Read:** `spec/adr/0028-intake-forms.md`, spec/07-booking.md,
`src/app/actions/booking.ts`, `src/platform/chatbot/ingest.ts` (the PHI
guard), spec/12-migrations-and-data.md.

## Scope

- Phase 15: in progress.

## Tasks

### 15.1 `IntakeForm` — the tenant's contact-only pre-visit form

`IntakeForm` — tenant-owned, a name + `fields` Json (label, kind, required).
`IntakeResponse` — the visitor's answers, one per appointment. The booking
flow's `intakeFormId` points at the form; the visitor's answers land on the
appointment.

**Tests:** integration — a form's fields validate answers; a response
lands on the appointment.
**Done when:** the form + response models hold and validate.
- [ ] done

## Exit criteria

- The form + response models hold; tests green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
