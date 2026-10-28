"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import {
  cancelModuleDataPurge,
  requestModuleDataExport,
  scheduleModuleDataPurge,
  setModuleEnabled,
} from "@/app/actions/modules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * The row of actions under one module (task 2.10): enable/disable, export
 * data, delete data (typed-name confirm), cancel a scheduled delete.
 */
export function ModuleActions({
  moduleKey,
  moduleName,
  enabled,
  purgeScheduled,
  tenantId,
}: {
  moduleKey: string
  moduleName: string
  enabled: boolean
  purgeScheduled: boolean
  tenantId?: string
}) {
  const t = useTranslations("dashboard.settings.modules")
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const r = await fn()
      setError(r.error ?? null)
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {enabled ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setModuleEnabled(moduleKey, false, tenantId))}
        >
          {t("actions.disable")}
        </Button>
      ) : (
        !purgeScheduled && (
          <Button size="sm" disabled={pending} onClick={() => run(() => setModuleEnabled(moduleKey, true, tenantId))}>
            {t("actions.enable")}
          </Button>
        )
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => requestModuleDataExport(moduleKey, tenantId))}
      >
        {t("actions.export")}
      </Button>
      {!enabled && !purgeScheduled && !confirming && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
          {t("actions.delete")}
        </Button>
      )}
      {purgeScheduled && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => cancelModuleDataPurge(moduleKey, tenantId))}
        >
          {t("actions.cancel")}
        </Button>
      )}
      {confirming && (
        <div className="flex items-center gap-2">
          <Input
            aria-label={t("actions.typeName", { name: moduleName })}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || typed.trim() !== moduleName}
            onClick={() => run(() => scheduleModuleDataPurge(moduleKey, typed, tenantId))}
          >
            {t("actions.confirmDelete")}
          </Button>
        </div>
      )}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  )
}
