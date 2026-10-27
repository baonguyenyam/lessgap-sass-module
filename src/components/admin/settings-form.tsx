"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { savePlatformSettings } from "@/app/actions/platform-settings"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PLATFORM_SETTINGS, type SettingKey } from "@/platform/settings/registry"

export type SettingField = {
  key: SettingKey
  label: string
  description: string
  kind: "select" | "switch"
  options?: { value: string; label: string }[]
  /** False when the viewer may see the value but not change it. */
  editable: boolean
}

// React Hook Form reads a dot as nesting; setting keys contain dots.
const toName = (key: string) => key.replaceAll(".", "__")

/**
 * One group of platform settings as a form (React Hook Form + the registry's
 * Zod schemas). The server action checks permission and parses every value
 * again; a field the viewer may not change is shown disabled.
 */
export function SettingsForm({ fields, values }: { fields: SettingField[]; values: Record<string, unknown> }) {
  const t = useTranslations("admin.settings")
  const router = useRouter()
  const schema = z.object(Object.fromEntries(fields.map((f) => [toName(f.key), PLATFORM_SETTINGS[f.key].schema])))
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema) as never,
    defaultValues: Object.fromEntries(
      fields.map((f) => [toName(f.key), f.kind === "select" ? String(values[f.key]) : values[f.key]])
    ),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const editable = fields.filter((f) => f.editable)
      return savePlatformSettings(Object.fromEntries(editable.map((f) => [f.key, form.getValues(toName(f.key))])))
    },
    onSuccess: (result) => {
      if (result.error) {
        form.setError("root", { message: result.error })
        return
      }
      toast.success(t("saved"))
      router.refresh()
    },
    onError: () => form.setError("root", { message: t("errors.failed") }),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => mutation.mutate())} className="space-y-6" noValidate>
        {fields.map((setting) => (
          <FormField
            key={setting.key}
            control={form.control}
            name={toName(setting.key)}
            render={({ field }) =>
              setting.kind === "switch" ? (
                <FormItem className="flex items-start justify-between gap-6 rounded-[var(--radius)] border border-border p-4">
                  <div className="space-y-1">
                    <FormLabel>{setting.label}</FormLabel>
                    <FormDescription>{setting.description}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                      disabled={!setting.editable}
                    />
                  </FormControl>
                </FormItem>
              ) : (
                <FormItem className="max-w-md">
                  <FormLabel>{setting.label}</FormLabel>
                  <Select value={String(field.value)} onValueChange={field.onChange} disabled={!setting.editable}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {setting.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{setting.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }
          />
        ))}
        {form.formState.errors.root?.message && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        {fields.some((f) => f.editable) ? (
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            {t("save")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("rootOnly")}</p>
        )}
      </form>
    </Form>
  )
}
