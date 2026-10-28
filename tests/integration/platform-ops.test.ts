import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db8 } from "@/lib/db8"
import { toDate, toTs } from "@/lib/timestamps"
import { newTimeId } from "@/lib/ids"
import { writeErrorReport } from "@/platform/error-report"
import { retryJob, runJobNow } from "@/platform/jobs/runner"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.13: the ops actions re-scope through requirePlatformRole — the same
// guards the console tests cover — so the integration here proves the record
// transitions a page depends on, plus the payload write and the
// resolve/recurrence pair the errors page shows.

describe("platform ops transitions", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a FAILED job goes back to QUEUED with attempts reset (retry), a QUEUED one becomes due (run-now)", async () => {
    const { Job } = db8.orm.public
    const failed = await Job.create({
      kind: "tenant.purge",
      status: "FAILED",
      attempts: 5,
      lastError: "boom",
      finishedAt: toTs(new Date()),
    })
    const queued = await Job.create({ kind: "tenant.purge", status: "QUEUED", runAt: toTs(new Date(2100, 0, 1)) })

    expect(await retryJob(failed.id)).toBe(true)
    expect(await runJobNow(queued.id)).toBe(true)

    const f = await Job.select("status", "attempts", "lastError", "runAt").where({ id: failed.id }).first()
    const q = await Job.select("runAt").where({ id: queued.id }).first()
    expect(f).toMatchObject({ status: "QUEUED", attempts: 0, lastError: null })
    expect(toDate(f!.runAt).getTime()).toBeLessThan(Date.now() + 60_000)
    expect(toDate(q!.runAt).getTime()).toBeLessThanOrEqual(Date.now() + 1_000)

    // Wrong-state rows are left alone: retry only moves FAILED, run-now only QUEUED.
    const done = await Job.create({ kind: "tenant.purge", status: "SUCCEEDED" })
    expect(await retryJob(queued.id)).toBe(false)
    expect(await retryJob(done.id)).toBe(false)
    expect(await runJobNow(done.id)).toBe(false)
  })

  it("resolving a digest sets resolvedAt; a recurrence clears it again", async () => {
    const { ErrorReport } = db8.orm.public
    const digest = `ops-${newTimeId()}`

    await writeErrorReport({
      digest,
      source: "platform",
      name: "TypeError",
      message: "masked",
      requestId: null,
      tenantId: null,
    })
    const report = await ErrorReport.select("id", "count", "resolvedAt").where({ digest }).first()
    expect(report?.count).toBe(1)

    await ErrorReport.where({ id: report!.id }).update({ resolvedAt: toTs(new Date()) })
    const resolved = await ErrorReport.select("resolvedAt").where({ id: report!.id }).first()
    expect(resolved?.resolvedAt).not.toBeNull()

    await writeErrorReport({
      digest,
      source: "platform",
      name: "TypeError",
      message: "masked",
      requestId: null,
      tenantId: null,
    })
    const after = await ErrorReport.select("count", "resolvedAt").where({ id: report!.id }).first()
    expect(after?.count).toBe(2)
    expect(after?.resolvedAt).toBeNull()
  })

  it("openEmailRecord keeps the rendered body on the row for the payload preview", async () => {
    const { openEmailRecord } = await import("@/lib/email-outbox")
    const id = await openEmailRecord({
      kind: "magic-link",
      to: "ops@example.com",
      subject: "Sign in",
      provider: "none",
      html: "<p>link</p>",
    })
    const row = await db8.orm.public.EmailMessage.select("payload", "toAddress", "subject").where({ id: id! }).first()
    expect(row?.toAddress).toBe("ops@example.com")
    expect((row?.payload as { html: string }).html).toBe("<p>link</p>")
  })

  it("a request without a session cannot call the ops actions", async () => {
    const { resolveError } = await import("@/app/actions/platform-ops")
    await expect(resolveError(newTimeId())).rejects.toThrow()
  })
})
