"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { addCategory, addService, deleteService } from "@/app/actions/catalog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/form/option-select"

/** The catalog add/remove actions (task 4.2): `addService` renders the add
 * form (name + optional category); `remove` renders a delete button. */
export function CatalogActions({
  addService: addServiceFlag,
  categories = [],
  serviceId,
}: {
  addService?: boolean
  remove?: boolean
  categories?: { id: string; name: string }[]
  serviceId?: string
}) {
  const t = useTranslations("dashboard.catalog")
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [duration, setDuration] = useState("60")
  const [price, setPrice] = useState("0")
  const [categoryId, setCategoryId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const r = await fn()
      setError(r.error ?? null)
    })

  if (addServiceFlag) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t("serviceName")}
          placeholder={t("serviceName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
        <Input
          aria-label={t("duration")}
          placeholder={t("duration")}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-28"
        />
        <Input
          aria-label={t("price")}
          placeholder={t("price")}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28"
        />
        {categories.length > 0 && (
          <OptionSelect
            aria-label={t("category")}
            value={categoryId}
            onValueChange={setCategoryId}
            className="w-40"
            placeholder={t("category")}
            options={[
              { value: "none", label: t("category") },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        )}
        <Button
          size="sm"
          disabled={pending || !name.trim()}
          onClick={() =>
            run(() =>
              addService({
                name,
                durationMinutes: Number(duration),
                priceCents: Math.round(Number(price) * 100),
                categoryId: categoryId === "none" || !categoryId ? undefined : categoryId,
              })
            )
          }
        >
          {t("actions.add")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !name.trim()}
          onClick={() => run(() => addCategory({ name }))}
        >
          {t("actions.addCategory")}
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteService(serviceId!))}>
      {t("actions.remove")}
    </Button>
  )
}
