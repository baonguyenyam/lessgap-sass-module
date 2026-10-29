import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { sendEmail } from "@/lib/email-transport"
import { templates, type TemplateData, type RenderedTemplate } from "@/emails/templates"
import type { TenantContext } from "@/platform/tenancy/context"

/** The one sender (task 5.6, spec/07): modules never call the email provider
 * directly — every message goes through `notify`, which resolves the
 * template (tenant override → code default, per locale), sends via
 * `sendEmail()`, and logs in `NotificationLog`. The platform name never
 * appears in tenant-to-customer messages unless the plan requires the badge. */
export async function renderTemplate(
  ctx: TenantContext,
  key: string,
  locale: string,
  data: TemplateData
): Promise<RenderedTemplate | null> {
  // A tenant's override lives in TenantSetting — `{subject, html}` for that
  // key+locale; the code default is the fallback, never the other way.
  const override = await db8.orm.public.TenantSetting.where({
    tenantId: ctx.tenantId,
    key: `notify.template.${key}.${locale}`,
  }).first()
  if (override) {
    const value = override.value as { subject?: string; html?: string }
    return { subject: value.subject ?? "", html: value.html ?? "" }
  }
  const def = templates[key]?.[locale] ?? templates[key]?.en
  return def ? def(data) : null
}

export async function notify(
  ctx: TenantContext,
  template: string,
  recipient: string,
  data: TemplateData,
  options: { locale?: string; channel?: "email" | "sms" } = {}
): Promise<void> {
  const locale = options.locale ?? "en"
  const rendered = await renderTemplate(ctx, template, locale, data)
  const ok = rendered
    ? await sendEmail({
        kind: template,
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        tenantId: ctx.tenantId,
      })
    : false
  await db8.orm.public.NotificationLog.create({
    tenantId: ctx.tenantId,
    channel: options.channel ?? "email",
    template,
    recipient,
    status: rendered ? (ok ? "sent" : "failed") : "failed",
    sentAt: rendered && ok ? nowTs() : null,
    payload: { subject: rendered?.subject ?? null, locale },
  })
}
