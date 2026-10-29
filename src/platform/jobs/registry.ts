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
  // Module purge (task 2.10, spec/15): after the 7-day grace, calls the
  // module's onPurge in batches until zero rows remain. Idempotent.
  "platform.module.purge": {
    handler: async (payload) => {
      const { runModulePurge } = await import("@/platform/modules/lifecycle")
      const purgeId = (payload as { purgeId?: string }).purgeId
      if (!purgeId) throw new Error("platform.module.purge without a purge id")
      await runModulePurge(purgeId)
    },
  },
  // Module export (task 2.10, spec/15): writes the module's own rows into the
  // ModuleExport row's files; the link lives for 7 days.
  "platform.module.export": {
    handler: async (payload) => {
      const { runModuleExport } = await import("@/platform/modules/lifecycle")
      const exportId = (payload as { exportId?: string }).exportId
      if (!exportId) throw new Error("platform.module.export without an export id")
      await runModuleExport(exportId)
    },
  },
  // Domain verification (task 3.7, spec/03): re-checks pending Domain rows
  // against the provider — an `active` result flips the row and audits.
  "platform.domain.verify": {
    handler: async (payload, context) => {
      const { checkDomain } = await import("@/platform/domains")
      const { systemContext } = await import("@/platform/tenancy/context")
      const { db8 } = await import("@/lib/db8")
      const hostname = (payload as { hostname?: string }).hostname
      const rows = hostname
        ? await db8.orm.public.Domain.where({ hostname }).all()
        : await db8.orm.public.Domain.where({ status: "pending" }).all()
      for (const row of rows) {
        try {
          await checkDomain(systemContext(row.tenantId, "platform.domain.verify"), row.hostname)
        } catch (error) {
          void error
        }
      }
      void context
    },
  },
  // Booking reminders (task 5.7, spec/07): every 15 minutes, the job
  // finds confirmed appointments inside a tenant's reminder windows and
  // sends `booking.reminder` — email always, SMS when entitled and
  // consented. `remindedAt` makes a rerun a no-op for that window.
  "platform.booking.remind": {
    schedule: "*/15 * * * *",
    handler: async () => {
      const { sendReminders } = await import("@/platform/booking/reminders")
      await sendReminders()
    },
  },
  // Chatbot re-index (task 7.2): a page/FAQ/document save enqueues one
  // row per tenant; the pipeline in src/platform/chatbot/ingest.ts is
  // idempotent per source checksum.
  "platform.chatbot.reindex": {
    handler: async (payload, context) => {
      const tenantId = (payload as { tenantId?: string }).tenantId ?? context.tenantId
      if (!tenantId) throw new Error("platform.chatbot.reindex without a tenant id")
      const { reindexTenant } = await import("@/platform/chatbot/ingest")
      await reindexTenant(tenantId)
    },
  },
  // Domain reconciliation (task 8.2): daily diff between the domain
  // provider's list and Domain rows; drifts land in DomainCheck for
  // /platform/domains.
  "platform.domain.reconcile": {
    schedule: "0 4 * * *",
    handler: async () => {
      const { reconcileDomains } = await import("@/platform/domains/reconcile")
      await reconcileDomains()
    },
  },
  // Tenant snapshot (task 8.3): on demand from the console, and nightly
  // per active tenant once the format has survived drills.
  "platform.tenant.snapshot": {
    handler: async (payload, context) => {
      const tenantId = (payload as { tenantId?: string }).tenantId ?? context.tenantId
      if (!tenantId) throw new Error("platform.tenant.snapshot without a tenant id")
      const { snapshotTenant } = await import("@/platform/backup/snapshot")
      await snapshotTenant(tenantId, (payload as { requestedBy?: string }).requestedBy)
    },
  },
  "platform.tenant.snapshot_nightly": {
    schedule: "0 3 * * *",
    handler: async () => {
      const { db8 } = await import("@/lib/db8")
      const { snapshotTenant } = await import("@/platform/backup/snapshot")
      const tenants = await db8.orm.public.Tenant.where({ status: "ACTIVE" }).all()
      for (const tenant of tenants) await snapshotTenant(tenant.id)
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
