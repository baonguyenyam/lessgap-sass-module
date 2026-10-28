import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { buildErrorReport, writeErrorReport } from "@/platform/error-report"
import { resetDatabase } from "@tests/helpers/db"

describe("ErrorReport (O4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("merges occurrences of one digest into one row and reopens a resolved group", async () => {
    const error = new Error("failed for person@example.com")
    const first = buildErrorReport({ error, event: "e", source: "dashboard", requestId: "req-00000001" })
    await writeErrorReport(first)
    await db8.orm.public.ErrorReport.where({ digest: first.digest }).update({ resolvedAt: nowTs() })
    await writeErrorReport({ ...first, requestId: "req-00000002" })

    const rows = await db8.orm.public.ErrorReport.where({ digest: first.digest }).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      count: 2,
      requestId: "req-00000002",
      resolvedAt: null,
      message: "failed for [address]",
      source: "dashboard",
    })
  })
})
