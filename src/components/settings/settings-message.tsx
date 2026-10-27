import { getTranslations } from "next-intl/server"
import { settingsMessage } from "@/lib/settings-pages"

/**
 * The result of an account action, which arrives as `?ok=` or `?error=` on the
 * settings page the form lives on. An unknown code shows nothing.
 */
export async function SettingsMessage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams
  const message = settingsMessage(error ?? ok)
  if (!message) return null
  const t = await getTranslations("dashboard.settings.messages")

  return (
    <p
      role={message.error ? "alert" : "status"}
      className={`rounded-lg border px-4 py-2.5 text-sm ${
        message.error
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-primary"
      }`}
    >
      {t(message.code)}
    </p>
  )
}
