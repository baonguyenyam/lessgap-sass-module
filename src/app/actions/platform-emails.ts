"use server"

import { sendEmail } from "@/lib/email-transport"
import { templates } from "@/emails/templates"
import { requirePlatformRole } from "@/platform/staff"
import { audit } from "@/platform/audit"

/** Staff send-test (task 5.6): renders the template's code default for the
 * given locale and sends it to the staff member's own address — never a
 * tenant's customer. */
export async function sendTestEmail(input: {
  templateKey: string
  locale: string
  to: string
}): Promise<{ error?: string }> {
  const staff = await requirePlatformRole()
  const render = templates[input.templateKey]?.[input.locale]
  if (!render) return { error: "not_found" }
  const rendered = render({
    name: "Ana",
    service: "Manicure",
    staff: "Mia",
    time: "2027-03-08 15:00 UTC",
    manageUrl: "https://example.test",
    business: "Fixture Co",
  })
  await sendEmail({
    kind: `test.${input.templateKey}`,
    to: input.to,
    subject: `[test] ${rendered.subject}`,
    html: rendered.html,
  })
  await audit(
    { tenantId: null, actor: { kind: "platform", userId: staff.user.id } },
    {
      action: "platform.email.test_sent",
      targetType: "NotificationLog",
      data: { template: input.templateKey, locale: input.locale },
    }
  )
  return {}
}
