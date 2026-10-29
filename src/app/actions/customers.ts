"use server"

import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { TenantContext } from "@/platform/tenancy/context"

/** Customer actions (task 5.5): per-customer export and delete for privacy
 * requests — `Customer` is the privacy boundary, every action scopes to the
 * member's tenant and audits. */
async function ctx(): Promise<TenantContext> {
  const c = await requireTenantContext("customers", "manage")
  return { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } }
}

async function guard(fn: (c: TenantContext) => Promise<unknown>): Promise<{ error?: string }> {
  try {
    const c = await ctx()
    await requireModule(c, "customers")
    await fn(c)
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** One customer's rows, JSON-encoded — a privacy export. */
export async function exportCustomer(input: { customerId: string }): Promise<{ error?: string; json?: string }> {
  try {
    const c = await ctx()
    await requireModule(c, "customers")
    const customer = await db8.orm.public.Customer.where({ tenantId: c.tenantId, id: input.customerId }).first()
    if (!customer) throw new AppError("not_found")
    const appointments = await db8.orm.public.Appointment.where({ tenantId: c.tenantId, customerId: customer.id }).all()
    await audit(c, { action: "customers.exported", targetType: "Customer", targetId: customer.id })
    return { json: JSON.stringify({ customer, appointments }, null, 2) }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function deleteCustomer(input: { customerId: string }) {
  return guard(async (c) => {
    const customer = await db8.orm.public.Customer.where({ tenantId: c.tenantId, id: input.customerId }).first()
    if (!customer) throw new AppError("not_found")
    // A customer's appointments go with them — the privacy request means it.
    await db8.orm.public.Appointment.where({ tenantId: c.tenantId, customerId: customer.id }).delete()
    await db8.orm.public.Customer.where({ id: customer.id }).delete()
    await audit(c, { action: "customers.deleted", targetType: "Customer", targetId: customer.id })
  })
}
