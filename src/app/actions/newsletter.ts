"use server"

import crypto from "node:crypto"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { siteConfig } from "@/config/site"
import { sendNewsletterConfirmEmail } from "@/lib/email"
import { nowTs } from "@/lib/timestamps"
import { tenantSubscribers } from "@/platform/newsletter/tenant-list"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { requireModule } from "@/platform/modules/runtime"

const PAGE = "/t/[slug]/newsletter"
const token = () => crypto.randomBytes(24).toString("base64url")

/** Adds an address to this workspace's list; it joins once the person confirms by email. */
export async function addTenantSubscriber(values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("newsletter", "manage")
  await requireModule(
    { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id, role: ctx.member.role } },
    "newsletter"
  )
  const t = await getTranslations("dashboard.newsletter.errors")
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(t("invalidEmail")).max(254) })
    .safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { email } = parsed.data

  const list = tenantSubscribers(ctx.tenantId)
  const existing = await list.where({ email }).first()
  if (existing && !existing.unsubscribedAt) return { error: t("exists") }

  const confirmToken = token()
  if (existing) {
    await list.where({ email }).update({ confirmToken, confirmedAt: null, unsubscribedAt: null, createdAt: nowTs() })
  } else {
    await list.create({ tenantId: ctx.tenantId, email, source: "manual", confirmToken, unsubscribeToken: token() })
  }
  await sendNewsletterConfirmEmail(email, `${siteConfig.url}/newsletter/confirm?token=${confirmToken}`).catch((error) =>
    console.error("[newsletter] confirmation email failed:", error)
  )
  revalidatePath(PAGE, "page")
  return {}
}

/** Unsubscribes addresses from this workspace's list; ids from another workspace match nothing. */
export async function unsubscribeTenantSubscribers(ids: string[]): Promise<{ changed: number }> {
  const ctx = await requireTenantContext("newsletter", "manage")
  await requireModule(
    { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id, role: ctx.member.role } },
    "newsletter"
  )
  const unique = [...new Set(ids)].slice(0, 500)
  if (unique.length === 0) return { changed: 0 }
  const changed = await tenantSubscribers(ctx.tenantId)
    .where((s) => s.id.in(unique))
    .where((s) => s.unsubscribedAt.isNull())
    .updateAndCount({ unsubscribedAt: nowTs() })
  revalidatePath(PAGE, "page")
  return { changed }
}
