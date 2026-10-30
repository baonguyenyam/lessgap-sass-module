"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { revokeEntitlementOverride, setEntitlementOverride } from "@/app/actions/platform-overrides"
import { useDrawer } from "@/stores/drawer"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/form/option-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"

export type OverrideRow = {
  id: string
  featureKey: string
  value: unknown
  ignoresSwitch: boolean
  reason: string
  expiresAt: string | null
}

const KIND = "tenant-override-edit"
const REVOKE = "tenant-override-revoke"
const schema = z.object({
  featureKey: z.string().min(1),
  value: z.string().min(1),
  reason: z.string().min(1),
  expiresAt: z.string(),
  ignoresSwitch: z.boolean(),
})

/** The tenant's entitlement overrides (task 2.6): grant/change any feature
 * with a reason and optional expiry; every row audited; expired rows stop
 * applying without being deleted. */
export function TenantOverrides({
  tenantId,
  rows,
  featureKeys,
}: {
  tenantId: string
  rows: OverrideRow[]
  featureKeys: string[]
}) {
  const t = useTranslations("platform.overrides")
  const openDrawer = useDrawer((s) => s.open)
  const id = useDrawer((s) => s.id)
  const open = useDrawer((s) => s.kind === KIND)
  const revoking = useDrawer((s) => s.kind === REVOKE)
  const current = id ? rows.find((r) => r.id === id) : undefined
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const options = featureKeys.map((k) => ({ value: k, label: k }))

  const newButton = (
    <Button size="sm" variant="outline" onClick={() => openDrawer(KIND)}>
      <Plus className="mr-2 h-4 w-4" />
      {t("new")}
    </Button>
  )

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title={t("empty")} description={t("empty_hint")} action={newButton} />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("title")}</CardTitle>
            {newButton}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.feature")}</TableHead>
                  <TableHead>{t("columns.value")}</TableHead>
                  <TableHead>{t("columns.reason")}</TableHead>
                  <TableHead>{t("columns.expires")}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">
                      {row.featureKey}
                      {row.ignoresSwitch && (
                        <Badge variant="secondary" className="ml-2">
                          {t("ignoresSwitch")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{JSON.stringify(row.value)}</TableCell>
                    <TableCell className="text-sm">{row.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("edit")}
                          onClick={() => openDrawer(KIND, row.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("revoke")}
                          onClick={() => openDrawer(REVOKE, row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {revoking && current && (
        <FormDrawer
          kind={REVOKE}
          title={t("revokeTitle")}
          description={t("revokeDescription", { key: current.featureKey })}
          form={form}
          onSubmit={async () => revokeEntitlementOverride(current.id)}
        >
          <></>
        </FormDrawer>
      )}
      {open && (
        <FormDrawer
          kind={KIND}
          title={current ? t("editTitle") : t("newTitle")}
          description={t("description")}
          form={form}
          onSubmit={async (values) => {
            let parsed: unknown = values.value
            try {
              parsed = JSON.parse(values.value)
            } catch {
              parsed = values.value
            }
            return setEntitlementOverride(
              tenantId,
              values.featureKey,
              parsed,
              values.reason,
              values.expiresAt || null,
              values.ignoresSwitch
            )
          }}
        >
          <FormField
            control={form.control}
            name="featureKey"
            defaultValue={current?.featureKey ?? featureKeys[0]}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.feature")}</FormLabel>
                <FormControl>
                  <OptionSelect value={field.value} onValueChange={field.onChange} options={options} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            defaultValue={current ? JSON.stringify(current.value) : "true"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.value")}</FormLabel>
                <FormControl>
                  <Input {...field} className="font-mono" placeholder="true | 25 | null" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            defaultValue={current?.reason ?? ""}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.reason")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiresAt"
            defaultValue={current?.expiresAt ? new Date(current.expiresAt).toISOString().slice(0, 10) : ""}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.expires")}</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ignoresSwitch"
            defaultValue={current?.ignoresSwitch ?? false}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">{t("ignoresSwitchLabel")}</FormLabel>
              </FormItem>
            )}
          />
        </FormDrawer>
      )}
    </>
  )
}
