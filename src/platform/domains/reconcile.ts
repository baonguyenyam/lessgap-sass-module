import { db8 } from "@/lib/db8"
import { domainProvider } from "@/platform/domains/provider"

/** Daily domain reconciliation (task 8.2): the provider's own view vs the
 * `Domain` rows — a row the provider doesn't know ("missing_provider") or
 * a provider hostname no row claims ("extra_provider"). Each run writes
 * one `DomainCheck` batch keyed by `runId`; the console reads the latest. */
export async function reconcileDomains(): Promise<{ runId: string; missing: number; extra: number }> {
  const provider = domainProvider()
  if (!provider.listDomains) return { runId: "", missing: 0, extra: 0 }
  const [providerList, rows] = await Promise.all([provider.listDomains(), db8.orm.public.Domain.all()])
  const providerSet = new Set(providerList.map((h) => h.toLowerCase()))
  const rowSet = new Set(rows.map((r) => r.hostname.toLowerCase()))
  const runId = `run_${Date.now().toString(36)}`
  let missing = 0
  let extra = 0
  for (const row of rows) {
    if (!providerSet.has(row.hostname.toLowerCase())) {
      await db8.orm.public.DomainCheck.create({
        runId,
        hostname: row.hostname,
        kind: "missing_provider",
        tenantId: row.tenantId,
      })
      missing++
    }
  }
  for (const hostname of providerList) {
    if (!rowSet.has(hostname.toLowerCase())) {
      await db8.orm.public.DomainCheck.create({ runId, hostname, kind: "extra_provider" })
      extra++
    }
  }
  return { runId, missing, extra }
}
