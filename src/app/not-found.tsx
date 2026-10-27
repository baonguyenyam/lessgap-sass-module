"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Home } from "lucide-react"
import { siteConfig } from "@/config/site"

export default function NotFound() {
  const t = useTranslations("notFound")
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(30)

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push("/")
      return
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [secondsLeft, router])

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 py-24 sm:py-32">
      {/* Background decorations */}
      <div className="bg-grid absolute inset-0 opacity-35" />
      <div className="bg-glow pointer-events-none absolute inset-0" />

      {/* Content wrapper */}
      <div className="relative z-10 mx-auto max-w-md text-center">
        {/* Decorative 404 tag */}
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 ring-inset">
          {t("badge")}
        </span>

        {/* Title */}
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{t("title")}</h1>

        {/* Description */}
        <p className="mt-6 text-base leading-7 text-muted-foreground">{t("body")}</p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/95 sm:w-auto"
          >
            <Home className="h-4 w-4" />
            {t("home")}
          </Link>
        </div>

        {/* Countdown */}
        <p className="mt-8 text-xs text-muted-foreground/80">
          {t.rich("redirecting", {
            seconds: secondsLeft,
            strong: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
          })}
        </p>

        {/* Branding Footer */}
        <div className="mt-16 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </div>
      </div>
    </div>
  )
}
