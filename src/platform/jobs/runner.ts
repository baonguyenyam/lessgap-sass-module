import { and, or } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
import { describeError } from "@/platform/error-report"
import { log } from "@/platform/log"
import { JOBS, type JobRegistry } from "@/platform/jobs/registry"
import { backoffMinutes, nextRun } from "@/platform/jobs/schedule"

/**
 * The job runner (ADR 0008, spec/16-operations.md). The cron route calls
 * `runDueJobs`; everything else enqueues. The table holds the state, so any
 * number of concurrent callers is safe: a claim is one `UPDATE … FOR UPDATE
 * SKIP LOCKED`, and a run that outlives its lock is claimed again later.
 */

/** How long a claimed run may take before another runner may reclaim it. */
const LOCK_MINUTES = 5

export async function enqueueJob(
  kind: string,
  payload: Record<string, unknown> = {},
  options: { runAt?: Date; tenantId?: string; maxAttempts?: number } = {}
): Promise<string> {
  const row = await db8.orm.public.Job.create({
    kind,
    payload: payload as never,
    runAt: toTs(options.runAt ?? new Date()),
    tenantId: options.tenantId ?? null,
    ...(options.maxAttempts ? { maxAttempts: options.maxAttempts } : {}),
  })
  return row.id
}

/**
 * Keeps one future row for every scheduled kind. Under a transaction-level
 * advisory lock, so two runners at the same minute do not both add one.
 */
export async function materializeSchedules(registry: JobRegistry = JOBS, now = new Date()): Promise<number> {
  const scheduled = Object.entries(registry).filter(([, definition]) => definition.schedule)
  if (scheduled.length === 0) return 0
  return db8.transaction(async (tx) => {
    await tx.execute(
      tx.raw.sql`SELECT pg_advisory_xact_lock(hashtext('platform.jobs.schedule'))`.affectedCount().build()
    )
    let created = 0
    for (const [kind, definition] of scheduled) {
      const pending = await tx.orm.public.Job.where((j) =>
        and(j.kind.eq(kind), or(j.status.eq("QUEUED"), j.status.eq("RUNNING")))
      ).first()
      if (pending) continue
      await tx.orm.public.Job.create({
        kind,
        runAt: toTs(nextRun(definition.schedule!, now)),
        ...(definition.maxAttempts ? { maxAttempts: definition.maxAttempts } : {}),
      })
      created++
    }
    return created
  })
}

/** Claims up to `limit` due rows (and overdue running ones) for this run, oldest first. */
export async function claimDueJobs(limit: number, requestId: string | null): Promise<string[]> {
  const plan = db8.raw.sql`
    UPDATE "Job" SET
      "status" = 'RUNNING',
      "attempts" = "attempts" + 1,
      "lockedUntil" = now() + make_interval(mins => ${LOCK_MINUTES}),
      "requestId" = NULLIF(${requestId ?? ""}, ''),
      "updatedAt" = now()
    WHERE "id" IN (
      SELECT "id" FROM "Job"
      WHERE ("status" = 'QUEUED' AND "runAt" <= now())
         OR ("status" = 'RUNNING' AND "lockedUntil" < now())
      ORDER BY "runAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `
    .returnsRow({ id: "pg/text@1" })
    .build()
  const rows = await db8.query(plan)
  return rows.map((row) => row.id)
}

export type RunSummary = { claimed: number; succeeded: number; retried: number; failed: number }

/** One cron tick: keep schedules, claim what is due, run it, record each outcome. */
export async function runDueJobs(
  options: { limit?: number; requestId?: string | null; registry?: JobRegistry } = {}
): Promise<RunSummary> {
  const registry = options.registry ?? JOBS
  const requestId = options.requestId ?? null
  await materializeSchedules(registry)
  const ids = await claimDueJobs(options.limit ?? 20, requestId)
  const summary: RunSummary = { claimed: ids.length, succeeded: 0, retried: 0, failed: 0 }

  for (const id of ids) {
    const job = await db8.orm.public.Job.where({ id }).first()
    if (!job) continue
    const definition = registry[job.kind]
    try {
      if (!definition) throw new Error(`unknown job kind "${job.kind}"`)
      await definition.handler(job.payload, { jobId: job.id, attempt: job.attempts, tenantId: job.tenantId, requestId })
      await db8.orm.public.Job.where({ id }).update({
        status: "SUCCEEDED",
        lockedUntil: null,
        lastError: null,
        finishedAt: nowTs(),
      })
      summary.succeeded++
    } catch (error) {
      const lastError = describeError(error).message
      const giveUp = !definition || job.attempts >= (definition.maxAttempts ?? job.maxAttempts)
      await db8.orm.public.Job.where({ id }).update(
        giveUp
          ? { status: "FAILED", lockedUntil: null, lastError, finishedAt: nowTs() }
          : {
              status: "QUEUED",
              lockedUntil: null,
              lastError,
              runAt: toTs(new Date(Date.now() + backoffMinutes(job.attempts) * 60_000)),
            }
      )
      if (giveUp) summary.failed++
      else summary.retried++
      await log.error("platform.job.failed", {
        error,
        source: "job",
        requestId,
        tenantId: job.tenantId ?? undefined,
        kind: job.kind,
        attempt: job.attempts,
        final: giveUp,
      })
    }
  }
  return summary
}

/** Puts a FAILED job back in the queue with its attempts reset (the console's retry button, phase 1). */
export async function retryJob(id: string): Promise<boolean> {
  const count = await db8.orm.public.Job.where({ id, status: "FAILED" }).updateAndCount({
    status: "QUEUED",
    attempts: 0,
    lastError: null,
    runAt: nowTs(),
    finishedAt: null,
  })
  return count > 0
}
