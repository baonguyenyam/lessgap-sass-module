"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { buyGiftCard } from "@/app/actions/gift-cards"
import { buyPackage, activateMembership } from "@/app/actions/packages-memberships"

/** Till-side sell actions (task 12.5): a card, a package onto a customer,
 * a membership activation. */
export function SalesActions({
  packages,
  memberships,
  customers,
}: {
  packages: { id: string; name: string }[]
  memberships: { id: string; name: string }[]
  customers: { id: string; name: string }[]
}) {
  const t = useTranslations("dashboard.sales")
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [email, setEmail] = useState("")
  const [pkgId, setPkgId] = useState("")
  const [memId, setMemId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  async function run(kind: "card" | "pkg" | "mem") {
    setPending(kind)
    setDone(null)
    const res =
      kind === "card"
        ? await buyGiftCard({ amountCents: Math.round(Number(amount) * 100), buyerEmail: email || undefined })
        : kind === "pkg"
          ? await buyPackage({ packageId: pkgId, customerId })
          : await activateMembership({ membershipId: memId, customerId })
    setPending(null)
    setDone("error" in res && res.error ? `error.${res.error}` : "ok")
    router.refresh()
  }
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t("sell_card")}</Label>
        <div className="flex gap-2">
          <Input placeholder={t("amount")} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={() => run("card")} disabled={pending !== null || !amount}>
            {pending === "card" ? t("selling") : t("sell")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("sell_pkg")}</Label>
        <div className="flex gap-2">
          <NativeSelect value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
            <NativeSelectOption value="">{t("choose_pkg")}</NativeSelectOption>
            {packages.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <NativeSelectOption value="">{t("choose_customer")}</NativeSelectOption>
            {customers.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button onClick={() => run("pkg")} disabled={pending !== null || !pkgId || !customerId}>
            {pending === "pkg" ? t("selling") : t("sell")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("sell_mem")}</Label>
        <div className="flex gap-2">
          <NativeSelect value={memId} onChange={(e) => setMemId(e.target.value)}>
            <NativeSelectOption value="">{t("choose_mem")}</NativeSelectOption>
            {memberships.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button onClick={() => run("mem")} disabled={pending !== null || !memId || !customerId}>
            {pending === "mem" ? t("selling") : t("sell")}
          </Button>
        </div>
      </div>
      {done === "ok" && <p className="text-sm text-muted-foreground">{t("sold")}</p>}
      {done && done !== "ok" && <p className="text-sm text-destructive">{done}</p>}
    </div>
  )
}
