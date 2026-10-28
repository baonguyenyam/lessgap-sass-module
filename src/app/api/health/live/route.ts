import { connection, NextResponse } from "next/server"

/**
 * Liveness for load checks (spec/16-operations.md): the process answers. No
 * database, no dependencies, so a slow database never takes instances out of
 * rotation; `/api/health` is the deep check for the uptime monitor.
 */
export async function GET() {
  // At request time, never prerendered (spec/adr/0022).
  await connection()
  return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } })
}
