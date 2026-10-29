import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { toDate } from "@/lib/timestamps"
import { AcceptButtons } from "@/components/quotes/accept-buttons"

/** The signed quote accept page (task 6.6): the token is the quote's
 * signed link — lines, total, deposit (if any), accept or decline. */
export default async function QuoteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const quote = await db8.orm.public.Quote.where({ tenantId: resolved.tenantId, accessToken: token })
    .include("lines")
    .first()
  if (!quote || quote.status !== "sent") notFound()
  const t = await getTranslations("site.quote")
  const expired = quote.validUntil ? toDate(quote.validUntil) < new Date() : false
  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{t("accept_title")}</h1>
        <p className="text-muted-foreground">
          {quote.customerName} · {t("total", { amount: (quote.totalCents / 100).toFixed(2) })}
          {quote.validUntil && ` · ${t("valid_until")} ${toDate(quote.validUntil).toUTCString().slice(0, 16)}`}
        </p>
      </div>
      <ul className="divide-y">
        {quote.lines.map((l) => (
          <li key={l.id} className="flex justify-between py-2 text-sm">
            <span>
              {l.name} ×{l.quantity}
            </span>
            <span>{((l.unitPriceCents * l.quantity) / 100).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      {quote.depositCents ? (
        <p className="text-sm">{t("deposit", { amount: (quote.depositCents / 100).toFixed(2) })}</p>
      ) : null}
      {quote.terms && <p className="text-xs text-muted-foreground">{quote.terms}</p>}
      {expired ? <p className="text-sm text-destructive">{t("expired")}</p> : <AcceptButtons token={token} />}
    </div>
  )
}
