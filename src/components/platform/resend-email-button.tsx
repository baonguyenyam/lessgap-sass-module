"use client"

import { Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTransition } from "react"
import { toast } from "sonner"
import { resendEmail } from "@/app/actions/platform-ops"
import { Button } from "@/components/ui/button"

/** Sends the stored body again through the normal transport — a new EmailMessage row records the attempt. */
export function ResendEmailButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const t = useTranslations("platform.emails")
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendEmail(id)
          if (result.error) toast.error(t(`errors.${result.error}`))
          else toast.success(t("resent"))
          router.refresh()
        })
      }
    >
      <Mail className="size-4" />
      {pending ? t("resending") : t("resend")}
    </Button>
  )
}
