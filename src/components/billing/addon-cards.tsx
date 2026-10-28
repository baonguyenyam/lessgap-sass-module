"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type AddOnData = {
  id: string
  name: string
  features: string
  owned: boolean
}

/** The add-ons a tenant can buy (task 2.7): a one-time checkout grants a
 * TenantAddOn row, and the resolver folds its feature map in. */
export function AddOnCards({ addOns, disabled }: { addOns: AddOnData[]; disabled: boolean }) {
  const t = useTranslations("billing.addons")

  const buy = async (addonId: string) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addonId }),
    })
    const json = (await res.json()) as { url?: string }
    if (json.url) window.location.assign(json.url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {addOns.map((addOn) => (
            <li key={addOn.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{addOn.name}</p>
                {addOn.features && <p className="font-mono text-xs text-muted-foreground">{addOn.features}</p>}
              </div>
              <div className="ml-auto flex items-center gap-3">
                {addOn.owned ? (
                  <Badge variant="secondary">{t("owned")}</Badge>
                ) : (
                  <Button size="sm" variant="outline" disabled={disabled} onClick={() => buy(addOn.id)}>
                    {t("buy")}
                  </Button>
                )}
              </div>
            </li>
          ))}
          {addOns.length === 0 && <li className="py-3 text-sm text-muted-foreground">{t("empty")}</li>}
        </ul>
      </CardContent>
    </Card>
  )
}
