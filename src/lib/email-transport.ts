import { siteConfig } from "@/config/site"
import { deliver, deliveryResult } from "@/lib/email-delivery"
import type { Resend } from "resend"
import type { ResendOutcome } from "@/lib/email-delivery"

/**
 * The one place the kit talks to an email provider.
 *
 * Every email the kit sends (sign-in links, receipts, the contact form, the
 * newsletter) goes through `sendEmail()`, and every place that asks "is email
 * set up?" asks `emailEnabled()`. Resend is the default. To use another
 * provider, SMTP through Nodemailer, Postmark, SES or anything with an API,
 * rewrite these two functions and nothing else.
 *
 * Kept free of heavy imports on purpose: src/auth.ts reads `emailEnabled()`
 * when it starts, so the Resend SDK is loaded only when an email is sent.
 */

/**
 * Platform change (spec/adr/0009): Brevo is the provider when BREVO_API_KEY is
 * set, and wins over Resend. Resend stays as the kit shipped it, so a
 * deployment without Brevo behaves as before.
 */
function provider(): "brevo" | "resend" | null {
  if (process.env.BREVO_API_KEY) return "brevo"
  if (process.env.RESEND_API_KEY) return "resend"
  return null
}

/** Whether outgoing email is configured. Sign-in by link, password reset and every notification depend on it. */
export function emailEnabled(): boolean {
  return provider() !== null
}

/** The sender of every email. Set EMAIL_FROM to an address on your verified domain. */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? `${siteConfig.name} <${siteConfig.contactEmail}>`

export type OutgoingEmail = {
  /** Names the email in the logs, for example "magic-link". Never the recipient. */
  kind: string
  to: string
  subject: string
  html: string
  replyTo?: string
  /** The workspace the email is sent for, when there is one; recorded on the `EmailMessage` row. */
  tenantId?: string
}

/**
 * Sends one email and says whether the provider accepted it.
 *
 * Returns false instead of throwing when the provider refuses the message, and
 * logs why (src/lib/email-delivery.ts explains the reason: several flows must
 * answer the same way whether or not an address exists). A missing key or a
 * network failure still throws, as before. Keep both behaviours if you replace
 * the provider.
 *
 * Every call leaves exactly one `EmailMessage` row (spec/16-operations.md):
 * opened before the provider is asked, settled to SENT, REFUSED or FAILED
 * after, including when the send throws.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const name = provider()
  const { openEmailRecord, settleEmailRecord } = await import("@/lib/email-outbox")
  const record = await openEmailRecord({ ...email, provider: name ?? "none" })
  let outcome: ResendOutcome | undefined
  const capture = (send: () => Promise<ResendOutcome>) => async () => (outcome = await send())
  try {
    let accepted: boolean
    if (name === "brevo") {
      accepted = await deliver(
        email.kind,
        capture(() => sendWithBrevo(email)),
        undefined,
        "Brevo"
      )
    } else {
      const resend = await resendClient()
      accepted = await deliver(
        email.kind,
        capture(() =>
          resend.emails.send({
            from: EMAIL_FROM,
            to: email.to,
            subject: email.subject,
            html: email.html,
            replyTo: email.replyTo,
          })
        )
      )
    }
    await settleEmailRecord(record, deliveryResult({ outcome: outcome! }))
    return accepted
  } catch (error) {
    await settleEmailRecord(record, deliveryResult({ thrown: error }))
    throw error
  }
}

/**
 * Splits `Name <address>` into its parts, as Brevo wants the sender as an
 * object. A bare address is accepted too, with no name.
 */
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<\s*([^<>\s]+)\s*>\s*$/)
  if (!match) return { email: from.trim() }
  const name = match[1].replace(/^"|"$/g, "").trim()
  return name ? { name, email: match[2] } : { email: match[2] }
}

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

/**
 * One transactional email through Brevo's API, answered in the shape
 * `deliver()` reads. A refusal (4xx/5xx) resolves with an error, like Resend's
 * SDK does; a network failure throws, like Resend's does.
 */
async function sendWithBrevo(email: OutgoingEmail): Promise<ResendOutcome> {
  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(EMAIL_FROM),
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      ...(email.replyTo ? { replyTo: { email: email.replyTo } } : {}),
    }),
  })
  if (response.ok) {
    const sent = (await response.json().catch(() => null)) as { messageId?: string } | null
    return { data: sent?.messageId ? { id: sent.messageId } : null, error: null }
  }
  const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
  return {
    error: {
      name: body?.code ?? "brevo_error",
      message: body?.message ?? response.statusText,
      statusCode: response.status,
    },
  }
}

let _resend: Resend | null = null

/**
 * The Resend client, created on first use. Exported for the one feature that
 * is Resend's own and not email in general: mirroring newsletter subscribers
 * onto a Resend Audience (src/lib/email.ts). With another provider that
 * feature stays off, because RESEND_AUDIENCE_ID is unset.
 */
export async function resendClient(): Promise<Resend> {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    const { Resend } = await import("resend")
    _resend = new Resend(key)
  }
  return _resend
}
