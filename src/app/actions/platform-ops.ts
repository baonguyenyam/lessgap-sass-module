"use server"

import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { sendEmail } from "@/lib/email-transport"
import { nowTs } from "@/lib/timestamps"
import { audit, platformAuditContext } from "@/platform/audit"
import { retryJob, runJobNow } from "@/platform/jobs/runner"
import { requirePlatformRole } from "@/platform/staff"

/** FAILED → QUEUED again with attempts reset (ops page, task 1.13). */
export async function retryJobAction(id: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const job = await db8.orm.public.Job.select("tenantId").where({ id }).first()
  if (!job || !(await retryJob(id))) return { error: "notFound" }
  await audit(platformAuditContext(user.id, job.tenantId), { action: "platform.job.retried", targetId: id })
  revalidatePath("/platform/jobs", "page")
  return {}
}

/** QUEUED → due immediately. */
export async function runJobNowAction(id: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const job = await db8.orm.public.Job.select("tenantId").where({ id }).first()
  if (!job || !(await runJobNow(id))) return { error: "notFound" }
  await audit(platformAuditContext(user.id, job.tenantId), { action: "platform.job.run_now", targetId: id })
  revalidatePath("/platform/jobs", "page")
  return {}
}

/** Sends a stored email again; the new attempt writes its own EmailMessage row. */
export async function resendEmail(id: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const message = await db8.orm.public.EmailMessage.where({ id }).first()
  if (!message) return { error: "notFound" }
  const html = (message.payload as { html?: string } | null)?.html
  if (!html) return { error: "noPayload" }
  const ok = await sendEmail({
    kind: message.kind,
    to: message.toAddress,
    subject: message.subject,
    html,
    tenantId: message.tenantId ?? undefined,
  })
  await audit(platformAuditContext(user.id, message.tenantId), { action: "platform.email.resent", targetId: id })
  revalidatePath(`/platform/emails/${id}`, "page")
  revalidatePath("/platform/emails", "page")
  return ok ? {} : { error: "sendFailed" }
}

/** Marks a digest resolved; a recurrence clears resolvedAt inside writeErrorReport. */
export async function resolveError(id: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const report = await db8.orm.public.ErrorReport.select("tenantId").where({ id }).first()
  if (!report) return { error: "notFound" }
  await db8.orm.public.ErrorReport.where({ id }).update({ resolvedAt: nowTs() })
  await audit(platformAuditContext(user.id, report.tenantId), { action: "platform.error.resolved", targetId: id })
  revalidatePath("/platform/errors", "page")
  return {}
}
