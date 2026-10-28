import { connection, NextResponse } from "next/server"
import { cronAuthorization } from "@/platform/jobs/cron-auth"
import { runDueJobs } from "@/platform/jobs/runner"
import { REQUEST_ID_HEADER } from "@/platform/request-context"

// One tick claims at most a batch; a long queue drains over several ticks.
export const maxDuration = 60

/**
 * The job runner's trigger (ADR 0008, spec/16-operations.md): Vercel Cron once
 * a day as the floor, an external pinger every minute in production. Both call
 * this route with `CRON_SECRET`; the `Job` table, not the trigger, holds the
 * state, so concurrent calls are safe.
 */
async function handle(request: Request) {
  await connection()
  const access = cronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)
  if (access === "unconfigured") {
    return NextResponse.json(
      { error: "cron_secret_missing" },
      { status: 500, headers: { "cache-control": "no-store" } }
    )
  }
  if (access === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } })
  }
  const summary = await runDueJobs({ requestId: request.headers.get(REQUEST_ID_HEADER) })
  return NextResponse.json(summary, { headers: { "cache-control": "no-store" } })
}

export const GET = handle
export const POST = handle
