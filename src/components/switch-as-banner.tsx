import { Undo2 } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { stopImpersonation } from "@/app/actions/impersonation"
import { stopSwitchAs } from "@/app/actions/switch-as"
import { getImpersonation, getSwitchedBy } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * Shown on every signed-in screen while a Switch As session is open
 * (spec/adr/0015-switch-as.md), so nobody forgets whose account they are in.
 * A tenant impersonation (task 1.11) shows the written reason too and ends
 * back on the console.
 */
export async function SwitchAsBanner({ email }: { email?: string | null }) {
  if ((await getSwitchedBy()) === null) return null
  const t = await getTranslations("switchAs")
  const impersonation = await getImpersonation()

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-white"
    >
      {impersonation ? (
        <span>{t("impersonationBanner", { email: email ?? "", reason: impersonation.reason })}</span>
      ) : (
        <span>{t("banner", { email: email ?? "" })}</span>
      )}
      <form action={impersonation ? stopImpersonation : stopSwitchAs}>
        <Button type="submit" variant="secondary">
          <Undo2 />
          {impersonation ? t("endImpersonation") : t("back")}
        </Button>
      </form>
    </div>
  )
}
