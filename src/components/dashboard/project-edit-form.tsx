"use client"

import { useTranslations } from "next-intl"

import { useActionState, useEffect } from "react"
import { updateProject, type ProjectState } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/sonner"

interface ProjectEditFormProps {
  id: string
  name: string
  description: string | null
}

export function ProjectEditForm({ id, name, description }: ProjectEditFormProps) {
  const t = useTranslations("dashboard.projectEdit")
  const [state, action, isPending] = useActionState<ProjectState, FormData>(updateProject, {})

  useEffect(() => {
    if (state.success) toast.success(t("updated"))
    else if (state.error) toast.error(state.error)
  }, [state, t])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          placeholder={t("name")}
          aria-invalid={state.error ? true : undefined}
          maxLength={60}
          required
        />
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={description ?? ""}
          placeholder={t("descriptionPlaceholder")}
          maxLength={280}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
        {isPending && <Spinner />}
        Save changes
      </Button>
    </form>
  )
}
