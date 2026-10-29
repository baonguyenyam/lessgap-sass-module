import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { sendEmail } from "@/lib/email-transport"
import type { TenantContext } from "@/platform/tenancy/context"

/** The one sender (task 5.4/5.6, spec/07): modules never call the email
 * provider directly — every message goes through `notify`, which resolves
 * the template, sends, and logs in `NotificationLog`. Templates stay code
 * until 5.6 adds per-locale resolution and the templates page. */
export async function notify(
  ctx: TenantContext,
  template: string,
  recipient: string,
  data: { subject: string; html: string; text?: string }
): Promise<void> {
  const ok = await sendEmail({
    kind: template,
    to: recipient,
    subject: data.subject,
    html: data.html,
    tenantId: ctx.tenantId,
  })
  await db8.orm.public.NotificationLog.create({
    tenantId: ctx.tenantId,
    channel: "email",
    template,
    recipient,
    status: ok ? "sent" : "failed",
    sentAt: ok ? nowTs() : null,
    payload: { subject: data.subject },
  })
}
