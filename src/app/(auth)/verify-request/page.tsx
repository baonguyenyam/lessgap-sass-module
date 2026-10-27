import Link from "next/link"
import { useTranslations } from "next-intl"
import { LogoMark } from "@/components/logo"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

// Landing page after a magic link (or signup verification) email is sent.
// Configured as pages.verifyRequest in src/auth.ts.
export default function VerifyRequestPage() {
  const t = useTranslations("auth.verifyRequest")
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col text-center">
        <div className="mb-4 flex justify-center">
          <LogoMark className="h-12 w-12 rounded-2xl ring-1 ring-primary/15" iconClassName="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("body")}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          {/* The link is part of the sentence, so it stays inside the message.
              Handing a translator three fragments to reassemble is how word
              order breaks in languages that do not follow English. */}
          {t.rich("spam", {
            retry: (chunks) => (
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  )
}
