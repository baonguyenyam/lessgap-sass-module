"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { requestSnapshot, restoreToNewTenant, restoreInPlaceAction } from "@/app/actions/platform-backup"

/** Backups buttons (task 8.4): request a snapshot for a tenant, or
 * restore a done snapshot into a new tenant. */
export function BackupActions({
  tenantId,
  snapshotId,
  restore,
  inPlace,
}: {
  tenantId?: string
  snapshotId?: string
  restore?: boolean
  inPlace?: boolean
}) {
  const t = useTranslations("platform.backups")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  async function run() {
    setPending(true)
    const res = inPlace
      ? snapshotId
        ? await restoreInPlaceAction(snapshotId)
        : { error: "invalid" }
      : restore && snapshotId
        ? await restoreToNewTenant(snapshotId)
        : tenantId
          ? await requestSnapshot(tenantId)
          : { error: "invalid" }
    setPending(false)
    setDone("error" in res && res.error ? res.error : "ok")
  }
  return (
    <span className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={run}>
        {pending ? "…" : inPlace ? t("restore_in_place") : restore ? t("restore_to_new") : t("request_button")}
      </Button>
      {done === "ok" && <span className="text-xs text-muted-foreground">{t("done")}</span>}
      {done && done !== "ok" && <span className="text-xs text-destructive">{t(`error.${done}`)}</span>}
    </span>
  )
}
