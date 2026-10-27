"use client"

import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Form } from "@/components/ui/form"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useDrawer } from "@/stores/drawer"

/** What a server action behind a drawer answers: nothing on success, a message otherwise. */
export type DrawerResult = { error?: string } | void

/**
 * Create and edit, from a list, without leaving it (spec/adr/0020-application-stack.md): a Sheet
 * holding a React Hook Form form. Open when the drawer store's `kind` is this
 * drawer's; submitting runs `onSubmit` (a server action, which validates again)
 * through a TanStack Query mutation, then closes and refreshes the list.
 */
export function FormDrawer<TValues extends FieldValues>({
  kind,
  title,
  description,
  form,
  onSubmit,
  children,
}: {
  kind: string
  title: string
  description?: string
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
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="flex flex-1 flex-col gap-4 overflow-y-auto py-2"
            noValidate
          >
            {children}
            {form.formState.errors.root?.message && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <SheetFooter className="mt-auto pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Spinner />}
                {mutation.isPending ? t("saving") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
