import { getTranslations } from "next-intl/server"
import { stopSwitchAs } from "@/app/actions/switch-as"
import { getSwitchedBy } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * Shown on every signed-in screen while a Switch As session is open
 * (spec/adr/0015-switch-as.md), so nobody forgets whose account they are in.
 */
export async function SwitchAsBanner({ email }: { email?: string | null }) {
  if ((await getSwitchedBy()) === null) return null
  const t = await getTranslations("switchAs")

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-white"
    >
      <span>{t("banner", { email: email ?? "" })}</span>
      <form action={stopSwitchAs}>
        <Button type="submit" variant="secondary" size="sm">
          {t("back")}
        </Button>
      </form>
    </div>
  )
}
