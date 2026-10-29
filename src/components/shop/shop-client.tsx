"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { addToCart, checkoutCart } from "@/app/actions/shop"

/** The site shop client (task 6.4): add variants to the cookie cart, then
 * checkout — the server re-checks `canCharge` and returns the Stripe url. */
export function ShopClient({
  products,
  canCharge,
}: {
  products: {
    id: string
    name: string
    description: string | null
    variants: { id: string; name: string; priceCents: number }[]
  }[]
  canCharge: boolean
}) {
  const t = useTranslations("site.shop")
  const [cart, setCart] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function add(variantId: string) {
    const res = await addToCart({ variantId })
    if (!res.error) setCart((n) => n + 1)
  }
  async function checkout(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await checkoutCart({ name, email: email || undefined })
    setPending(false)
    if (res.error) setError(res.error)
    else if (res.checkoutUrl) window.location.href = res.checkoutUrl
    else setDone("ordered")
  }
  if (done) return <p role="status">{t("ordered")}</p>
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {products.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {p.variants.map((v) => (
                  <Button key={v.id} size="sm" variant="outline" disabled={!canCharge} onClick={() => add(v.id)}>
                    {v.name} · {(v.priceCents / 100).toFixed(2)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!canCharge && <p className="text-sm text-muted-foreground">{t("offline")}</p>}
      {canCharge && cart > 0 && (
        <form onSubmit={checkout} className="space-y-3 rounded-md border p-4">
          <p className="font-medium">{t("cart", { count: cart })}</p>
          <div className="space-y-1.5">
            <Label htmlFor="n">{t("name")}</Label>
            <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e">{t("email")}</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{t(`error.${error}`)}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? t("paying") : t("checkout")}
          </Button>
        </form>
      )}
    </div>
  )
}
