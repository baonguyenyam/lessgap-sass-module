"use client"

import { useTranslations } from "next-intl"

import { useActionState, useEffect } from "react"
import { updateProject, type ProjectState } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
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
          error={state.error}
          maxLength={60}
          required
        />
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

      <Button type="submit" loading={isPending} className="w-full sm:w-auto">
        Save changes
      </Button>
    </form>
  )
}
