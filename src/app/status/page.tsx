import { connection } from "next/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** `/status` (task 13.1, ADR 0029): the platform's own health — the latest
 * `HealthCheck` per kind. A first-party page the tenants' customers can
 * reach without a managed provider. */
export default async function StatusPage() {
  await connection()
  const checks = await db8.orm.public.HealthCheck.orderBy((c) => c.checkedAt.desc()).all()
  const latest = new Map<string, (typeof checks)[number]>()
  for (const c of checks) {
    if (!latest.has(c.kind)) latest.set(c.kind, c)
  }
  const overall = [...latest.values()].every((c) => c.status === "ok") ? "ok" : "degraded"
  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Status</h1>
      <p className="text-sm text-muted-foreground">{overall === "ok" ? "All systems operational." : "Degraded."}</p>
      <div className="space-y-3">
        {[...latest.entries()].map(([kind, c]) => (
          <Card key={kind}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm capitalize">{kind}</CardTitle>
            </CardHeader>
            <CardContent className="py-2 text-sm">
              <p>
                <span className={c.status === "ok" ? "text-green-600" : "text-destructive"}>{c.status}</span>
                {c.detail ? ` · ${c.detail}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">Checked {toDate(c.checkedAt).toUTCString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
