import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationSwitches } from "@/components/settings/notification-switches"
import { getUserSettingRows } from "@/platform/settings/tenant-store"
import { readNotifications } from "@/platform/settings/user"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Account → Notifications: which emails this person wants. */
export default async function NotificationsPage() {
  const user = await requireUser()
  const t = await getTranslations("dashboard.account.notifications")
  const values = readNotifications(await getUserSettingRows(user.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NotificationSwitches values={values} />
        <p className="text-xs text-muted-foreground">{t("alwaysSent")}</p>
      </CardContent>
    </Card>
  )
}
