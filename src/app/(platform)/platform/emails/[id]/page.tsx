import { getFormatter, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResendEmailButton } from "@/components/platform/resend-email-button"

export const instant = false

/** Platform → Emails → detail: one delivery attempt, its stored body, resend. */
export default async function PlatformEmailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformRole()
  const { id } = await params
  const t = await getTranslations("platform.emails")
  const format = await getFormatter()

  const message = await db8.orm.public.EmailMessage.where({ id }).first()
  if (!message) notFound()

  const html = (message.payload as { html?: string } | null)?.html ?? null
  const tenant = message.tenantId
    ? await db8.orm.public.Tenant.select("slug").where({ id: message.tenantId }).first()
    : null

  const fields: [string, React.ReactNode][] = [
    [t("colTo"), message.toAddress],
    [t("subject"), message.subject],
    [
      t("colKind"),
      <span key="k" className="font-mono">
        {message.kind}
      </span>,
    ],
    [
      t("colStatus"),
      <Badge key="s" variant={message.status === "FAILED" ? "destructive" : "secondary"}>
        {t(`status.${message.status}`)}
      </Badge>,
    ],
    [t("colProvider"), message.provider],
    [
      t("providerMessageId"),
      <span key="p" className="font-mono text-xs">
        {message.providerMessageId ?? "—"}
      </span>,
    ],
    [
      t("colTenant"),
      tenant ? (
        <Link key="t" href={`/platform/tenants/${tenant.slug}`} className="font-mono text-xs hover:underline">
          {tenant.slug}
        </Link>
      ) : (
        "—"
      ),
    ],
    [t("colCreatedAt"), format.dateTime(toDate(message.createdAt), "dateTime")],
    [t("sentAt"), message.sentAt ? format.dateTime(toDate(message.sentAt), "dateTime") : "—"],
    [t("lastError"), message.lastError ?? "—"],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="truncate text-2xl font-bold">{message.subject}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ResendEmailButton id={message.id} disabled={!html} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("payload")}</CardTitle>
          <CardDescription>{html ? t("payloadDescription") : t("payloadEmpty")}</CardDescription>
        </CardHeader>
        <CardContent>
          {html ? (
            <iframe
              title={t("payload")}
              sandbox=""
              srcDoc={html}
              className="h-[480px] w-full rounded-md border bg-white"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
