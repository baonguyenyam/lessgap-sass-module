"use client"

import { useTranslations } from "next-intl"

import { useState } from "react"
import { setUserRole } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { canChangeRole, type Role } from "@/lib/roles"

interface UserRoleButtonProps {
  userId: string
  currentRole: Role
  /** The signed-in viewer: only ROOT changes roles, and never their own. */
  viewer: { id: string; role: Role }
}

/**
 * "Make Admin" on a user, "Remove Admin" on an admin, nothing on a ROOT
 * account, on the viewer's own row, or for a viewer who is not ROOT. The rule
 * is `canChangeRole` in src/lib/roles.ts; the server action applies it again.
 */
export function UserRoleButton({ userId, currentRole, viewer }: UserRoleButtonProps) {
  const t = useTranslations("admin")
  const [loading, setLoading] = useState(false)
  const nextRole: Role = currentRole === "ADMIN" ? "USER" : "ADMIN"

  if (viewer.id === userId || !canChangeRole(viewer.role, currentRole, nextRole)) return null

  async function handleClick() {
    setLoading(true)
    try {
      // The role on screen travels with the request: if someone else changed
      // this user meanwhile, the action refuses instead of flipping it back.
      await setUserRole(userId, nextRole, currentRole)
      toast.success(nextRole === "ADMIN" ? t("rolePromoted") : t("roleDemoted"))
    } catch {
      toast.error(t("roleFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} loading={loading}>
      {nextRole === "ADMIN" ? t("makeAdmin") : t("removeAdmin")}
    </Button>
  )
}
