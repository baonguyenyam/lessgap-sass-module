"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { IntakeField } from "@/lib/intake"

/** Intake form CRUD (task 16.3): a tenant names a contact-only form and its
 * fields (label/kind/required — ADR 0028's scope, no PHI). */
export async function createIntakeForm(input: { name: string; fields: IntakeField[] }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z
      .object({
        name: z.string().min(1),
        fields: z.array(
          z.object({ label: z.string().min(1), kind: z.string().min(1), required: z.boolean().optional() })
        ).min(1),
      })
      .safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const form = await db8.orm.public.IntakeForm.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      fields: parsed.data.fields,
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.intake_form_created", targetType: "IntakeForm", targetId: form.id })
    return { id: form.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
