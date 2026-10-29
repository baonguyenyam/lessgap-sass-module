"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Checkbox } from "@/components/ui/checkbox"
import { pickupSlots, type PickupRule } from "@/lib/ordering/slots"
import { placeOrder } from "@/app/actions/ordering"

/** The site order client (task 6.5): a menu item + modifier checkboxes +
 * a pickup slot — the client recomputes slots for the pick; the server
 * re-checks capacity at placeOrder. */
export function OrderClient({
  now,
  products,
  groups,
  modifiers,
  rules,
  capacity,
  existing,
  canCharge,
}: {
  products: { id: string; name: string; variants: { id: string; name: string; priceCents: number }[] }[]
  groups: { id: string; productId: string; name: string; minSelections: number; maxSelections: number }[]
  modifiers: { id: string; groupId: string; name: string; priceCents: number }[]
  rules: PickupRule[]
  capacity: number
  existing: { pickupSlot: string | null; status: string }[]
  /** ISO — computed server-side (a client-side `new Date()` in
   * render trips Cache Components' prerender check). */
  now: string
  canCharge: boolean
}) {
  const t = useTranslations("site.order")
  const [line, setLine] = useState<{ variantId: string; productId: string; priceCents: number } | null>(null)
  const [modIds, setModIds] = useState<string[]>([])
  const [slot, setSlot] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const slots = pickupSlots(rules, capacity, existing, {
    startTs: now,
    endTs: new Date(new Date(now).getTime() + 14 * 24 * 3600 * 1000).toISOString(),
  }).slice(0, 30)
  const productGroups = line ? groups.filter((g) => g.productId === line.productId) : []
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await placeOrder({
      lines: [{ variantId: line!.variantId, quantity: 1, modifierIds: modIds }],
      pickupSlot: slot,
      name,
      phone: phone || undefined,
    })
    setPending(false)
    if (res.error) setError(res.error)
    else if (res.checkoutUrl) window.location.href = res.checkoutUrl
    else setDone(true)
  }
  if (done) return <p role="status">{t("ordered")}</p>
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="item">{t("item")}</Label>
        <NativeSelect
          id="item"
          required
          value={line?.variantId ?? ""}
          onChange={(e) => {
            const product = products.find((p) => p.variants.some((v) => v.id === e.target.value))
            const variant = product?.variants.find((v) => v.id === e.target.value)
            setLine(
              variant && product
                ? { variantId: variant.id, productId: product.id, priceCents: variant.priceCents }
                : null
            )
            setModIds([])
          }}
        >
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {products.flatMap((p) =>
            p.variants.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {p.name} · {v.name} · {(v.priceCents / 100).toFixed(2)}
              </NativeSelectOption>
            ))
          )}
        </NativeSelect>
      </div>
      {productGroups.map((g) => (
        <div key={g.id} className="space-y-1.5">
          <p className="text-sm font-medium">{g.name}</p>
          {modifiers
            .filter((m) => m.groupId === g.id)
            .map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={modIds.includes(m.id)}
                  onCheckedChange={(v) => setModIds(v === true ? [...modIds, m.id] : modIds.filter((x) => x !== m.id))}
                />
                {m.name} {m.priceCents > 0 && `+${(m.priceCents / 100).toFixed(2)}`}
              </label>
            ))}
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="slot">{t("pickup_slot")}</Label>
        <NativeSelect id="slot" required value={slot} onChange={(e) => setSlot(e.target.value)}>
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {slots.map((s) => (
            <NativeSelectOption key={s.startTs} value={s.startTs}>
              {new Date(s.startTs).toUTCString()} · {t("left", { count: s.remaining })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{t(`error.${error}`)}</p>}
      {!canCharge && <p className="text-sm text-muted-foreground">{t("offline")}</p>}
      <Button type="submit" disabled={pending || !line || !slot || !canCharge}>
        {pending ? t("placing") : t("place_order")}
      </Button>
    </form>
  )
}
