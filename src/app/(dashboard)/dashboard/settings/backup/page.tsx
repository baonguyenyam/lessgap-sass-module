import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * Settings → Backup: a copy of everything the app holds about the user, as a
 * JSON file. The file is built by `buildAccountExport` (src/lib/account-export.ts).
 */
export default async function BackupSettingsPage() {
  await requireUser()
  const t = await getTranslations("dashboard.settings.backup")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>{t("includes.profile")}</li>
          <li>{t("includes.security")}</li>
          <li>{t("includes.projects")}</li>
          <li>{t("includes.billing")}</li>
        </ul>
        <p className="text-muted-foreground">{t("excludes")}</p>
        {/* A file download from a route handler, not a page: `next/link`
            would prefetch it. */}
        <Button asChild variant="default">
          <a href="/api/account/export" download>
            {t("download")}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
