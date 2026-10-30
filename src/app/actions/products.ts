"use server"

import { getTranslations } from "next-intl/server"
import { packageSchema, membershipSchema } from "@/lib/schemas/tenant"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** Sellable-definitions CRUD (task 16.4): the `Package`/`Membership` rows a
 * `buyPackage`/`activateMembership` needs something to sell from. */
export async function createPackage(input: { name: string; sessions: number; priceCents: number }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const t = await getTranslations("dashboard.products.errors")
    const parsed = packageSchema({
      nameRequired: t("nameRequired"),
      sessionsInvalid: t("sessionsInvalid"),
      priceInvalid: t("priceInvalid"),
    }).safeParse({ ...input, price: input.priceCents / 100 })
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const pkg = await db8.orm.public.Package.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      sessions: parsed.data.sessions,
      priceCents: Math.round(parsed.data.price * 100),
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.package_created", targetType: "Package", targetId: pkg.id })
    return { id: pkg.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function createMembership(input: { name: string; priceCents: number }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const t = await getTranslations("dashboard.products.errors")
    const parsed = membershipSchema({
      nameRequired: t("nameRequired"),
      priceInvalid: t("priceInvalid"),
    }).safeParse({ ...input, price: input.priceCents / 100 })
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const mem = await db8.orm.public.Membership.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.membership_created", targetType: "Membership", targetId: mem.id })
    return { id: mem.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
