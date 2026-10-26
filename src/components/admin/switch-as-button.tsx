"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { startSwitchAs } from "@/app/actions/switch-as"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { canSwitchAs, type Role } from "@/lib/roles"

interface SwitchAsButtonProps {
  userId: string
  role: Role
  /** The signed-in viewer: only ROOT may switch, never onto ROOT or onto themselves. */
  viewer: { id: string; role: Role }
}

/**
 * "Switch as" on a user row (spec/adr/0015-switch-as.md). The rule is
 * `canSwitchAs` in src/lib/roles.ts; the server action applies it again.
 */
export function SwitchAsButton({ userId, role, viewer }: SwitchAsButtonProps) {
  const t = useTranslations("switchAs")
  const [loading, setLoading] = useState(false)

  if (!canSwitchAs({ ...viewer, switched: false }, { id: userId, role })) return null

  async function handleClick() {
    setLoading(true)
    try {
      // On success the action redirects to the dashboard as the other account.
      await startSwitchAs(userId)
    } catch {
      toast.error(t("failed"))
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} loading={loading}>
      {t("button")}
    </Button>
  )
}
