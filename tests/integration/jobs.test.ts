import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { claimDueJobs, enqueueJob, materializeSchedules, retryJob, runDueJobs } from "@/platform/jobs/runner"
import type { JobRegistry } from "@/platform/jobs/registry"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}))
// ErrorReport and Sentry are covered elsewhere; here a failing job only has to land in the table.
vi.mock("@/platform/log", () => ({ log: { error: async () => {}, info: () => {} } }))

const runs: string[] = []
const registry: JobRegistry = {
  "test.ok": {
    handler: async (_payload, { jobId }) => {
      // Slow enough that two concurrent ticks overlap.
      await new Promise((resolve) => setTimeout(resolve, 200))
      runs.push(jobId)
    },
  },
  "test.fail": { maxAttempts: 2, handler: async () => Promise.reject(new Error("broke for x@example.test")) },
  "test.daily": { schedule: "0 3 * * *", handler: async () => {} },
}

const job = (id: string) => db8.orm.public.Job.where({ id }).first()

afterAll(async () => db8.close())

describe("job runner", () => {
  beforeEach(async () => {
    await resetDatabase()
    runs.length = 0
  })
  it("runs a due job exactly once across two concurrent ticks (O1)", async () => {
    const id = await enqueueJob("test.ok")
    const [a, b] = await Promise.all([runDueJobs({ registry }), runDueJobs({ registry })])
    expect(runs).toEqual([id])
    expect(a.claimed + b.claimed).toBe(1)
    expect((await job(id))?.status).toBe("SUCCEEDED")
  })

  it("does not claim a job that is not due yet", async () => {
    await enqueueJob("test.ok", {}, { runAt: new Date(Date.now() + 60 * 60_000) })
    expect(await claimDueJobs(10, null)).toEqual([])
  })

  it("retries a failing job with backoff, then leaves it FAILED with a masked error (O2)", async () => {
    const id = await enqueueJob("test.fail")
    expect(await runDueJobs({ registry })).toMatchObject({ retried: 1 })
    let row = await job(id)
    expect(row).toMatchObject({ status: "QUEUED", attempts: 1, lastError: "broke for [address]" })
    expect(new Date(`${row!.runAt}Z`).getTime()).toBeGreaterThan(Date.now())

    // Make it due again instead of waiting for the backoff.
    await db8.orm.public.Job.where({ id }).update({ runAt: toTs(new Date(Date.now() - 1000)) })
    expect(await runDueJobs({ registry })).toMatchObject({ failed: 1 })
    row = await job(id)
    expect(row).toMatchObject({ status: "FAILED", attempts: 2, lockedUntil: null })

    expect(await retryJob(id)).toBe(true)
    expect(await job(id)).toMatchObject({ status: "QUEUED", attempts: 0, lastError: null })
  })

  it("reclaims a running job whose lock has expired", async () => {
    const id = await enqueueJob("test.ok")
    await db8.orm.public.Job.where({ id }).update({
      status: "RUNNING",
      attempts: 1,
      lockedUntil: toTs(new Date(Date.now() - 60_000)),
    })
    await runDueJobs({ registry })
    expect(await job(id)).toMatchObject({ status: "SUCCEEDED", attempts: 2 })
  })

  it("fails an unknown kind at once instead of retrying it", async () => {
    const id = await enqueueJob("nobody.handles.this")
    expect(await runDueJobs({ registry })).toMatchObject({ failed: 1 })
    expect((await job(id))?.lastError).toContain("unknown job kind")
  })

  it("keeps exactly one future row per scheduled kind, even when two runners race", async () => {
    await Promise.all([materializeSchedules(registry), materializeSchedules(registry)])
    const rows = await db8.orm.public.Job.where({ kind: "test.daily" }).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].runAt.slice(11, 16)).toBe("03:00")
  })
})

describe("GET /api/cron", () => {
  beforeEach(resetDatabase)

  it("refuses a call without CRON_SECRET, and one with the wrong secret (O7)", async () => {
    const { GET } = await import("@/app/api/cron/route")
    vi.stubEnv("CRON_SECRET", "")
    expect((await GET(new Request("http://x/api/cron"))).status).toBe(500)
    vi.stubEnv("CRON_SECRET", "s3cret")
    expect((await GET(new Request("http://x/api/cron", { headers: { authorization: "Bearer nope" } }))).status).toBe(
      401
    )
    vi.unstubAllEnvs()
  })

  it("runs a job enqueued for now on the next hit, and a concurrent hit does not run it again", async () => {
    const { GET } = await import("@/app/api/cron/route")
    vi.stubEnv("CRON_SECRET", "s3cret")
    const id = await enqueueJob("platform.error_reports.prune")
    const call = () => GET(new Request("http://x/api/cron", { headers: { authorization: "Bearer s3cret" } }))
    const [a, b] = await Promise.all([call(), call()])
    const summaries = [await a.json(), await b.json()]
    expect(summaries.reduce((n, s) => n + s.succeeded, 0)).toBe(1)
    expect((await job(id))?.status).toBe("SUCCEEDED")
    vi.unstubAllEnvs()
  })
})
