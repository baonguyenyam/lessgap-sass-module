"use client"

import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { useDrawer } from "@/stores/drawer"
import { createPackage, createMembership } from "@/app/actions/products"
import { packageSchema, membershipSchema, type PackageInput, type MembershipInput } from "@/lib/schemas/tenant"

const PKG = "product-package"
const MEM = "product-membership"

export function ProductAddButtons() {
  const t = useTranslations("dashboard.products")
  const openDrawer = useDrawer((s) => s.open)
  return (
    <>
      <Button variant="outline" onClick={() => openDrawer(MEM)}>
        <Plus className="h-4 w-4" />
        {t("add_membership")}
      </Button>
      <Button onClick={() => openDrawer(PKG)}>
        <Plus className="h-4 w-4" />
        {t("add_package")}
      </Button>
    </>
  )
}

export function ProductDrawers() {
  const t = useTranslations("dashboard.products")
  const te = useTranslations("dashboard.products.errors")
  const kind = useDrawer((s) => s.kind)
  const pkgForm = useForm<PackageInput>({
    resolver: zodResolver(
      packageSchema({
        nameRequired: te("nameRequired"),
        sessionsInvalid: te("sessionsInvalid"),
        priceInvalid: te("priceInvalid"),
      })
    ),
    defaultValues: { name: "", sessions: 5, price: 0 },
  })
  const memForm = useForm<MembershipInput>({
    resolver: zodResolver(membershipSchema({ nameRequired: te("nameRequired"), priceInvalid: te("priceInvalid") })),
    defaultValues: { name: "", price: 0 },
  })
  return (
    <>
      {kind === PKG && (
        <FormDrawer
          kind={PKG}
          title={t("add_package")}
          description={t("packageHint")}
          form={pkgForm}
          onSubmit={(v) => createPackage({ name: v.name, sessions: v.sessions, priceCents: Math.round(v.price * 100) })}
          size="sm"
        >
          <div className="grid gap-5">
            <FormField
              control={pkgForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={pkgForm.control}
              name="sessions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sessions")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={pkgForm.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("price")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step="0.01"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormDrawer>
      )}
      {kind === MEM && (
        <FormDrawer
          kind={MEM}
          title={t("add_membership")}
          description={t("membershipHint")}
          form={memForm}
          onSubmit={(v) => createMembership({ name: v.name, priceCents: Math.round(v.price * 100) })}
          size="sm"
        >
          <div className="grid gap-5">
            <FormField
              control={memForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={memForm.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("price")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step="0.01"
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormDrawer>
      )}
    </>
  )
}
