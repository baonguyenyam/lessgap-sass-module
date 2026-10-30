"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { OptionSelect } from "@/components/form/option-select"
import { saveEmailDesign } from "@/app/actions/email-templates"

/** The send design — `plain` raw body, `branded` the business header/footer
 * shell (`notify.design` TenantSetting). */
export function EmailDesignPicker({
  current,
  designs,
  canManage,
}: {
  current: string
  designs: string[]
  canManage: boolean
}) {
  const t = useTranslations("dashboard.emails")
  const router = useRouter()
  const [value, setValue] = useState(current)
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-3">
      <OptionSelect
        aria-label={t("design.label")}
        value={value}
        disabled={!canManage || pending}
        onValueChange={(v) => {
          setValue(v)
          startTransition(async () => {
            await saveEmailDesign(v)
            router.refresh()
          })
        }}
        options={designs.map((d) => ({ value: d, label: t(`design.${d}`) }))}
        className="w-56"
      />
      {pending && <span className="text-sm text-muted-foreground">{t("saving")}</span>}
    </div>
  )
}
