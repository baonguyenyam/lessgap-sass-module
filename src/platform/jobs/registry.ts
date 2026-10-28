/**
 * Every job kind the runner knows (ADR 0008). Platform kinds are declared
 * here; modules add theirs through their manifests' `jobs` from phase 1.
 *
 * A handler is idempotent: a run that dies after its work but before its
 * status write is run again. It receives the payload stored on the row and
 * returns nothing; throwing means "try again later".
 */

export type JobContext = { jobId: string; attempt: number; tenantId: string | null; requestId: string | null }

export type JobDefinition = {
  handler: (payload: unknown, context: JobContext) => Promise<void>
  /** Attempts before the job stays FAILED. Defaults to the row's (5). */
  maxAttempts?: number
  /** A five-field cron expression in UTC; the runner keeps one future row queued. */
  schedule?: string
}

export type JobRegistry = Record<string, JobDefinition>

const DAY_MS = 24 * 60 * 60 * 1000

export const JOBS: JobRegistry = {
  // ErrorReport groups not seen for 30 days (spec/16-operations.md).
  "platform.error_reports.prune": {
    schedule: "15 3 * * *",
    handler: async () => {
      const [{ db8 }, { toTs }] = await Promise.all([import("@/lib/db8"), import("@/lib/timestamps")])
      const cutoff = toTs(new Date(Date.now() - 30 * DAY_MS))
      await db8.orm.public.ErrorReport.where((r) => r.lastSeenAt.lt(cutoff)).deleteAndCount()
    },
  },
  // Email delivery records older than a year (spec/10-security-compliance.md, "Data retention").
  "platform.email_messages.prune": {
    schedule: "30 3 * * *",
    handler: async () => {
      const [{ db8 }, { toTs }] = await Promise.all([import("@/lib/db8"), import("@/lib/timestamps")])
      const cutoff = toTs(new Date(Date.now() - 365 * DAY_MS))
      await db8.orm.public.EmailMessage.where((m) => m.createdAt.lt(cutoff)).deleteAndCount()
    },
  },
  // Tenant deletion (task 1.14): the console action enqueues one row per
  // tenant; the purge itself lives in src/platform/tenancy/delete-tenant.ts.
  // Idempotent — deleting a missing tenant is a no-op.
  "platform.tenant.delete": {
    handler: async (payload, context) => {
      const tenantId = (payload as { tenantId?: string }).tenantId ?? context.tenantId
      if (!tenantId) throw new Error("platform.tenant.delete without a tenant id")
      const { deleteTenant } = await import("@/platform/tenancy/delete-tenant")
      await deleteTenant(tenantId)
    },
  },
}
