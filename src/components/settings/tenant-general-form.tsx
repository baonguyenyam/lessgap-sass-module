"use client"

import { useMutation } from "@tanstack/react-query"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { saveTenantGeneral } from "@/app/actions/tenant-settings"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type Values = { name: string; slug: string }

export function TenantGeneralForm({ name, slug, canManage }: Values & { canManage: boolean }) {
  const t = useTranslations("dashboard.settings.tenant")
  const router = useRouter()
  const form = useForm<Values>({ defaultValues: { name, slug } })
  const mutation = useMutation({
    mutationFn: (values: Values) => saveTenantGeneral(values),
    onSuccess: (result) => {
      if (result.error) return form.setError("root", { message: result.error })
      toast.success(t("saved"))
      router.refresh()
    },
    onError: () => form.setError("root", { message: t("errors.failed") }),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!canManage} maxLength={80} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("slug")}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!canManage} maxLength={48} className="font-mono" />
                </FormControl>
                <FormDescription>{t("slugHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {form.formState.errors.root?.message && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        {canManage ? (
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Check />}
            {t("save")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
        )}
      </form>
    </Form>
  )
}
