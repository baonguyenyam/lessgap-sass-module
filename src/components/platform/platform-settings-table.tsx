"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { setPlatformSwitch } from "@/app/actions/platform-settings"
import { useDrawer } from "@/stores/drawer"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type SwitchRow = { key: string; value: unknown; stored: unknown; group: string }

const KIND = "platform-switch-edit"

/** One row per platform switch (spec/04): effective value, and Edit → a JSON
 * literal the action validates against the key's schema when it has one. */
export function PlatformSettingsTable({ rows }: { rows: SwitchRow[] }) {
  const t = useTranslations("platform.settings")
  const openDrawer = useDrawer((s) => s.open)
  const id = useDrawer((s) => s.id)
  const open = useDrawer((s) => s.kind === KIND)
  const current = id ? rows.find((r) => r.key === id) : undefined
  const schema = z.object({ value: z.string().trim().min(1) })
  const form = useForm<{ value: string }>({ resolver: zodResolver(schema) })

  const showValue = (value: unknown) => (value === undefined ? "—" : JSON.stringify(value))

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.key")}</TableHead>
            <TableHead>{t("columns.value")}</TableHead>
            <TableHead>{t("columns.group")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-mono text-sm">{row.key}</TableCell>
              <TableCell className="font-mono text-sm">{showValue(row.value)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{row.group}</Badge>
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" aria-label={t("edit")} onClick={() => openDrawer(KIND, row.key)}>
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
          description={t("editDescription", { key: current.key })}
          form={form}
          onSubmit={async ({ value }) => {
            let parsed: unknown = value
            try {
              parsed = JSON.parse(value)
            } catch {
              // A bare string is a valid JSON value too — "off", not "\"off\"".
              parsed = value
            }
            return setPlatformSwitch(current.key, parsed)
          }}
        >
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.value")}</FormLabel>
                <FormControl>
                  <Textarea {...field} defaultValue={JSON.stringify(current.value)} rows={3} />
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
