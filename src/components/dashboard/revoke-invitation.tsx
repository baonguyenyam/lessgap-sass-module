"use client"

import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTransition } from "react"
import { toast } from "sonner"
import { cancelMemberInvitation } from "@/app/actions/members"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function RevokeInvitation({ id, email }: { id: string; email: string }) {
  const t = useTranslations("dashboard.members.invitations")
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("revoke", { email })}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelMemberInvitation(id)
          if (result.error) toast.error(result.error)
          else toast.success(t("revoked"))
        })
      }
    >
      {pending ? <Spinner /> : <X />}
    </Button>
  )
}
