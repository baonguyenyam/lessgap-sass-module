import { getFormatter, getTranslations } from "next-intl/server"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { db8 } from "@/lib/db8"
import { isRoot } from "@/lib/roles"
import { toDate } from "@/lib/timestamps"

/**
 * Who the account pages are about, above their menu (platform.madelab.io's
 * profile layout): photo, name, address, and on the right when the account
 * was opened with its standing (role, platform staff, two-factor).
 */
export async function ProfileHero({ userId }: { userId: string }) {
  const [t, format] = await Promise.all([getTranslations("dashboard.account.hero"), getFormatter()])
  const user = await db8.orm.public.User.select(
    "name",
    "email",
    "image",
    "role",
    "platformRole",
    "twoFactorEnabled",
    "createdAt"
  )
    .where({ id: userId })
    .first()
  if (!user) return null
  const display = user.name || user.email || ""
  const initials =
    display
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:flex-row sm:items-center">
      <Avatar className="size-20 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
        {user.image && <AvatarImage src={user.image} alt="" />}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold">{user.name || user.email}</h1>
        {user.name && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <p className="text-sm text-muted-foreground">
          {t.rich("memberSince", {
            date: format.dateTime(toDate(user.createdAt), { year: "numeric", month: "short", day: "numeric" }),
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          <Badge variant={user.twoFactorEnabled ? "success" : "outline"}>
            {t(user.twoFactorEnabled ? "twoFactorOn" : "twoFactorOff")}
          </Badge>
          {isRoot(user.role) && <Badge variant="secondary">{t("root")}</Badge>}
          {user.platformRole && <Badge variant="secondary">{t("platformStaff")}</Badge>}
        </div>
      </div>
    </section>
  )
}
