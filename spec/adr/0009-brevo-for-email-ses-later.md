# 0009. Brevo for email now, Amazon SES later, one transport

**Status:** accepted
**Date:** 2026-10-26

## Context
The kit sends every email through `sendEmail()` in `src/lib/email-transport.ts`,
with Resend. The company already sends from Brevo (verified sender
`hello@lessgap.com`) and plans to move to Amazon SES. Tenant notifications
(phase 5) will multiply volume.

## Decision
`sendEmail()` stays the only way email leaves the app. It picks the provider
from the environment: `BREVO_API_KEY` set → Brevo's transactional API;
otherwise `RESEND_API_KEY` → Resend, unchanged from the kit. Brevo is called
with `fetch`, no SDK. SES will be added the same way (a third branch, then
the default), without touching any caller.

## Consequences
- Every flow that checks `emailEnabled()` works with Brevo with no change.
- The kit's Resend Audience mirror for the newsletter stays off (no `RESEND_AUDIENCE_ID`).
- Before production, verify `lessgap.app` as a sending domain (SPF, DKIM, DMARC)
  so platform mail is not sent from another domain; tenant-to-customer mail
  needs its own sender policy (decided in phase 5).

## Options considered
- **Brevo over SMTP with Nodemailer:** works, adds a dependency and a connection per send on serverless.
- **Switch straight to SES:** not set up yet; the transport makes the move a later one-line change.
