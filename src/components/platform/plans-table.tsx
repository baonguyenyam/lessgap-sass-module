"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { updatePlan } from "@/app/actions/platform-plans"
import { useDrawer } from "@/stores/drawer"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OptionSelect } from "@/components/form/option-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type PlanRow = {
  id: string
  name: string
  slug: string
  price: number
  interval: string
  visibility: string
  setupFeeCents: number | null
  features: Record<string, unknown>
  subscribers: number
}

const KIND = "platform-plan-edit"
const schema = z.object({
  visibility: z.string(),
  setupFeeCents: z.string(),
  features: z.string(),
})

/** Plans with their visibility and subscriber count; Edit opens a drawer that
 * names the tenants a change reaches before it saves (task 2.5). */
export function PlansTable({ rows }: { rows: PlanRow[] }) {
  const t = useTranslations("platform.plans")
  const openDrawer = useDrawer((s) => s.open)
  const id = useDrawer((s) => s.id)
  const open = useDrawer((s) => s.kind === KIND)
  const current = id ? rows.find((r) => r.id === id) : undefined
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.name")}</TableHead>
            <TableHead>{t("columns.price")}</TableHead>
            <TableHead>{t("columns.visibility")}</TableHead>
            <TableHead>{t("columns.features")}</TableHead>
            <TableHead>{t("columns.subscribers")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{row.slug}</div>
              </TableCell>
              <TableCell>
                {(row.price / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })} /{" "}
                {row.interval.toLowerCase()}
              </TableCell>
              <TableCell>
                <Badge variant={row.visibility === "PUBLIC" ? "secondary" : "outline"}>{row.visibility}</Badge>
              </TableCell>
              <TableCell className="max-w-56 truncate font-mono text-xs">
                {Object.keys(row.features).length === 0 ? "—" : JSON.stringify(row.features)}
              </TableCell>
              <TableCell>{row.subscribers}</TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" aria-label={t("edit")} onClick={() => openDrawer(KIND, row.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {open && current && (
        <FormDrawer
          kind={KIND}
          title={t("editTitle")}
          description={t("editDescription", { name: current.name, subscribers: current.subscribers })}
          form={form}
          onSubmit={async (values) => {
            let features: unknown
            try {
              features = JSON.parse(values.features)
            } catch {
              return { error: t("errors.badJson") }
            }
            return updatePlan(current.id, {
              visibility: values.visibility,
              setupFeeCents: values.setupFeeCents.trim() === "" ? null : Number(values.setupFeeCents),
              features,
            })
          }}
        >
          <FormField
            control={form.control}
            name="visibility"
            defaultValue={current.visibility}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.visibility")}</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={["PUBLIC", "UNLISTED", "ARCHIVED"].map((v) => ({ value: v, label: v }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="setupFeeCents"
            defaultValue={current.setupFeeCents === null ? "" : String(current.setupFeeCents)}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("setupFee")}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0} placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="features"
            defaultValue={JSON.stringify(current.features)}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.features")}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} className="font-mono text-xs" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormDrawer>
      )}
    </div>
  )
}
