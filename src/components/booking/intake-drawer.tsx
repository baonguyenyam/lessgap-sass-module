"use client"

import { useTranslations } from "next-intl"
import { ClipboardList, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { useDrawer } from "@/stores/drawer"
import { createIntakeForm } from "@/app/actions/intake"
import { intakeFormSchema, type IntakeFormInput } from "@/lib/schemas/tenant"

const ADD = "intake-form-add"

export function IntakeAddButton() {
  const t = useTranslations("dashboard.intake")
  const openDrawer = useDrawer((s) => s.open)
  return (
    <Button onClick={() => openDrawer(ADD)}>
      <Plus className="h-4 w-4" />
      {t("add")}
    </Button>
  )
}

export function IntakeEmptyAction() {
  const t = useTranslations("dashboard.intake")
  const openDrawer = useDrawer((s) => s.open)
  return (
    <Button onClick={() => openDrawer(ADD)}>
      <Plus />
      {t("add")}
    </Button>
  )
}

export { ADD as INTAKE_DRAWER }

export function IntakeFormDrawer() {
  const t = useTranslations("dashboard.intake")
  const te = useTranslations("dashboard.intake.errors")
  const open = useDrawer((s) => s.kind === ADD)
  const form = useForm<IntakeFormInput>({
    resolver: zodResolver(intakeFormSchema({ nameRequired: te("nameRequired"), fieldsRequired: te("fieldsRequired") })),
    defaultValues: { name: "", labels: "" },
  })
  if (!open) return null
  return (
    <FormDrawer
      kind={ADD}
      title={t("add")}
      description={t("addHint")}
      form={form}
      onSubmit={(v) =>
        createIntakeForm({
          name: v.name,
          fields: v.labels
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .map((label) => ({ label, kind: "text" as const })),
        })
      }
      size="sm"
    >
      <div className="grid gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form_name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="labels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("fields_placeholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDrawer>
  )
}
