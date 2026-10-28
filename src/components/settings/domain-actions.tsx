"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { addTenantDomain, checkTenantDomain, removeTenantDomain, setPrimaryTenantDomain } from "@/app/actions/domains"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** The domain actions (task 3.7): check now, make primary, remove — and the
 * add form when `add` is set. */
export function DomainActions({
  hostname,
  status,
  isPrimary,
  add,
}: {
  hostname?: string
  status?: string
  isPrimary?: boolean
  add?: boolean
}) {
  const t = useTranslations("dashboard.settings.domains")
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const r = await fn()
      setError(r.error ?? null)
    })

  if (add) {
    return (
      <div className="flex items-center gap-2">
        <Input
          aria-label={t("addPlaceholder")}
          placeholder={t("addPlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button size="sm" disabled={pending || !name.includes(".")} onClick={() => run(() => addTenantDomain(name))}>
          {t("actions.add")}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => checkTenantDomain(hostname!))}>
          {t("actions.check")}
        </Button>
      )}
      {status === "active" && !isPrimary && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setPrimaryTenantDomain(hostname!))}
        >
          {t("actions.primary")}
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => run(() => removeTenantDomain(hostname!))}
      >
        {t("actions.remove")}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  )
}
