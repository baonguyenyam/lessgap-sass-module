"use client"

import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { OptionSelect } from "@/components/form/option-select"
import { useDrawer } from "@/stores/drawer"
import { buyGiftCard } from "@/app/actions/gift-cards"
import { buyPackage, activateMembership } from "@/app/actions/packages-memberships"
import { saleSchema, type SaleInput } from "@/lib/schemas/tenant"

const SELL = "sale-sell"

export function SaleButton({
  packages,
  memberships,
  customers,
}: {
  packages: { id: string; name: string }[]
  memberships: { id: string; name: string }[]
  customers: { id: string; name: string }[]
}) {
  const t = useTranslations("dashboard.sales")
  const openDrawer = useDrawer((s) => s.open)
  return (
    <>
      <Button onClick={() => openDrawer(SELL)}>
        <Plus className="h-4 w-4" />
        {t("sell")}
      </Button>
      <SaleDrawer packages={packages} memberships={memberships} customers={customers} />
    </>
  )
}

export function SaleDrawer({
  packages,
  memberships,
  customers,
}: {
  packages: { id: string; name: string }[]
  memberships: { id: string; name: string }[]
  customers: { id: string; name: string }[]
}) {
  const t = useTranslations("dashboard.sales")
  const te = useTranslations("dashboard.sales.errors")
  const open = useDrawer((s) => s.kind === SELL)
  const form = useForm<SaleInput>({
    resolver: zodResolver(
      saleSchema({
        amountInvalid: te("amountInvalid"),
        emailInvalid: te("emailInvalid"),
        selectRequired: te("selectRequired"),
      })
    ),
    defaultValues: { kind: "card", amount: undefined, email: "", packageId: "", membershipId: "", customerId: "" },
  })
  const kind = useWatch({ control: form.control, name: "kind" })
  if (!open) return null
  return (
    <FormDrawer
      kind={SELL}
      title={t("sell")}
      description={t("sellHint")}
      form={form}
      onSubmit={(v) =>
        v.kind === "card"
          ? buyGiftCard({ amountCents: Math.round((v.amount ?? 0) * 100), buyerEmail: v.email || undefined })
          : v.kind === "pkg"
            ? buyPackage({ packageId: v.packageId!, customerId: v.customerId! })
            : activateMembership({ membershipId: v.membershipId!, customerId: v.customerId! })
      }
      size="sm"
    >
      <div className="grid gap-5">
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("sellKind")}</FormLabel>
              <FormControl>
                <OptionSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: "card", label: t("sell_card") },
                    { value: "pkg", label: t("sell_pkg") },
                    { value: "mem", label: t("sell_mem") },
                  ]}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {kind === "card" && (
          <>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("amount")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      min={0}
                      step="0.01"
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {kind === "pkg" && (
          <FormField
            control={form.control}
            name="packageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("choose_pkg")}</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    options={packages.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {kind === "mem" && (
          <FormField
            control={form.control}
            name="membershipId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("choose_mem")}</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    options={memberships.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {kind !== "card" && (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("choose_customer")}</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    options={customers.map((x) => ({ value: x.id, label: x.name }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </FormDrawer>
  )
}
