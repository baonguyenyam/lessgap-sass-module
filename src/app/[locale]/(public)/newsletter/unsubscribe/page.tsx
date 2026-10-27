import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { removeNewsletterContact } from "@/lib/email"
import { HOME, siteConfig } from "@/config/site"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "newsletter" })
  return {
    title: `${t("unsubscribeTitle")} | ${siteConfig.name}`,
    robots: { index: false },
  }
}

/**
 * One-click unsubscribe with immediate effect: flips unsubscribedAt in the
 * database and removes the contact from the Resend Audience. Idempotent.
 */
export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const t = await getTranslations("newsletter")

  let done = false
  if (token) {
    const sub = await db8.orm.public.NewsletterSubscriber.where({ unsubscribeToken: token }).first()
    if (sub) {
      if (!sub.unsubscribedAt) {
        await db8.orm.public.NewsletterSubscriber.where({ id: sub.id }).update({ unsubscribedAt: nowTs() })
        try {
          await removeNewsletterContact(sub.email)
        } catch (error) {
          console.error("[newsletter] audience removal failed:", error)
        }
      }
      done = true
    }
  }

  return (
    <section className="flex min-h-[60vh] items-center py-24">
      <div className="mx-auto max-w-xl px-6 text-center lg:px-12">
        {done ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("unsubscribedHeading")}</h1>
            <p className="mt-4 text-muted-foreground">{t("unsubscribedBody")}</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("unknownHeading")}</h1>
            <p className="mt-4 text-muted-foreground">{t("unknownBody")}</p>
          </>
        )}
        <Link
          href={HOME}
          className="mt-8 inline-block rounded-full [background-image:var(--gradient-brand)] px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("backToSite")}
        </Link>
      </div>
    </section>
  )
}
