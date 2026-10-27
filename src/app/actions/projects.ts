"use server"

import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { projectSchema } from "@/lib/schemas/project"

export type ProjectState = { error?: string; success?: boolean }

/**
 * Built per call rather than once at import time, because the messages it
 * carries end up in front of the user (`toast.error(state.error)`), and a
 * translation can only be resolved inside a request.
 *
 * The shape itself lives in src/lib/schemas/project.ts so the form in the
 * browser validates against the same rules instead of a second copy.
 */
async function schema() {
  const t = await getTranslations("errors")
  return projectSchema({
    nameRequired: t("nameRequired"),
    nameTooLong: t("nameTooLong"),
    descriptionTooLong: t("descriptionTooLong"),
  })
}

export async function updateProject(_prevState: ProjectState, formData: FormData): Promise<ProjectState> {
  const t = await getTranslations("errors")
  const user = await getCurrentUser()
  if (!user) return { error: t("unauthorized") }

  const id = String(formData.get("id") ?? "")
  const result = (await schema()).safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  })
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  // Ownership check — never trust the client-supplied id.
  const existing = await db8.orm.public.Project.where({ id }).first()
  if (!existing || existing.userId !== user.id) {
    return { error: t("projectNotFound") }
  }

  await db8.orm.public.Project.where({ id }).update({
    name: result.data.name,
    description: result.data.description ?? null,
  })

  revalidatePath("/dashboard/projects")
  revalidatePath(`/dashboard/projects/${id}`)
  return { success: true }
}

export async function deleteProject(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const id = String(formData.get("id") ?? "")

  // Ownership check — only delete a project that belongs to the current user.
  const existing = await db8.orm.public.Project.where({ id }).first()
  if (!existing || existing.userId !== user.id) return

  await db8.orm.public.Project.where({ id }).delete()

  revalidatePath("/dashboard/projects")
  revalidatePath("/dashboard")
  redirect("/dashboard/projects")
}

/**
 * Creates (`id` null) or edits a project from the projects drawer. The form's
 * values are parsed again here; editing only matches a project the caller
 * owns, so another user's id changes nothing.
 */
export async function saveProject(id: string | null, values: unknown): Promise<{ error?: string }> {
  const t = await getTranslations("errors")
  const user = await getCurrentUser()
  if (!user) return { error: t("unauthorized") }
  const result = (await schema()).safeParse(values)
  if (!result.success) return { error: result.error.issues[0].message }
  const data = { name: result.data.name, description: result.data.description || null }

  if (id === null) {
    await db8.orm.public.Project.create({ ...data, userId: user.id })
  } else {
    const updated = await db8.orm.public.Project.where({ id, userId: user.id }).update(data)
    if (!updated) return { error: t("projectNotFound") }
  }
  revalidatePath("/dashboard/projects")
  revalidatePath("/dashboard")
  return {}
}

/** Deletes the caller's own projects among `ids`; anything else is ignored. */
export async function deleteProjects(ids: string[]): Promise<{ deleted: number }> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const unique = [...new Set(ids)].slice(0, 500)
  if (unique.length === 0) return { deleted: 0 }
  const deleted = await db8.orm.public.Project.where({ userId: user.id })
    .where((p) => p.id.in(unique))
    .deleteAndCount()
  revalidatePath("/dashboard/projects")
  revalidatePath("/dashboard")
  return { deleted }
}
