"use client"

import { Check, X } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Form } from "@/components/ui/form"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useDrawer } from "@/stores/drawer"

/** What a server action behind a drawer answers: nothing on success, a message otherwise. */
export type DrawerResult = { error?: string } | void

/**
 * How wide the drawer opens from `sm` up (full width on a phone), chosen by
 * what it holds: `sm` a single field, `md` a short form, `lg` a form with
 * long text, `xl` a grid of options. Prefixed with `data-[side=right]` so it
 * outranks the Sheet's own `max-w-sm`.
 */
const WIDTHS = {
  sm: "data-[side=right]:sm:max-w-sm",
  md: "data-[side=right]:sm:max-w-md",
  lg: "data-[side=right]:sm:max-w-xl",
  xl: "data-[side=right]:sm:max-w-3xl",
} as const

export type DrawerSize = keyof typeof WIDTHS

/**
 * Create and edit, from a list, without leaving it (spec/adr/0020-application-stack.md): a Sheet
 * holding a React Hook Form form. Open when the drawer store's `kind` is this
 * drawer's; submitting runs `onSubmit` (a server action, which validates again)
 * through a TanStack Query mutation, then closes and refreshes the list.
 *
 * The header and the buttons stay put while the fields scroll between them.
 * The fields sit in a padded area so their focus ring is never clipped; lay
 * fields out in columns with a grid inside `children`.
 */
export function FormDrawer<TValues extends FieldValues>({
  kind,
  title,
  description,
  size = "md",
  form,
  onSubmit,
  children,
}: {
  kind: string
  title: string
  description?: string
  size?: DrawerSize
  form: UseFormReturn<TValues>
  onSubmit: (values: TValues) => Promise<DrawerResult>
  children: React.ReactNode
}) {
  const t = useTranslations("dataTable")
  const router = useRouter()
  const open = useDrawer((state) => state.kind === kind)
  const close = useDrawer((state) => state.close)

  const mutation = useMutation({
    mutationFn: onSubmit,
    onSuccess: (result) => {
      if (result && result.error) {
        form.setError("root", { message: result.error })
        return
      }
      toast.success(t("done"))
      close()
      router.refresh()
    },
    onError: () => form.setError("root", { message: t("failed") }),
  })

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !mutation.isPending && close()}>
      <SheetContent className={cn("gap-0 data-[side=right]:w-full", WIDTHS[size])}>
        <SheetHeader className="gap-1 border-b border-border px-6 py-4 pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription className="truncate">{description}</SheetDescription>}
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              {children}
              {form.formState.errors.root?.message && (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
            </div>
            <SheetFooter className="mt-0 grid grid-cols-2 gap-2 border-t border-border px-6 py-4 sm:flex sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>
                <X />
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="sm:min-w-24">
                {mutation.isPending ? <Spinner /> : <Check />}
                {mutation.isPending ? t("saving") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
