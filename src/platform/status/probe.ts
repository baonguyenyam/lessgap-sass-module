import { sql } from "kysely"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { authDb } from "@/lib/kysely"
import { toTs } from "@/lib/timestamps"

/**
 * The status probe (task 13.1, ADR 0029): write a `HealthCheck` per kind —
 * the status page reads the latest. `database` times a `SELECT 1`; `queue`
 * checks the job table is live (a stuck `Job` older than an hour degrades).
 */
export async function probeHealth() {
  const t0 = Date.now()
  let db: "ok" | "down" = "ok"
  try {
    await sql`SELECT 1`.execute(authDb)
  } catch {
    db = "down"
  }
  await db8.orm.public.HealthCheck.create({
    kind: "database",
    status: db,
    detail: db === "ok" ? null : "unreachable",
    latencyMs: Date.now() - t0,
  })

  const stuck = await db8.orm.public.Job.where((j) =>
    and(j.status.eq("RUNNING"), j.lockedUntil.lt(toTs(new Date(Date.now() - 3600_000))))
  ).all()
  await db8.orm.public.HealthCheck.create({
    kind: "queue",
    status: stuck.length === 0 ? "ok" : "degraded",
    detail: stuck.length === 0 ? null : `${stuck.length} stuck`,
  })
}
