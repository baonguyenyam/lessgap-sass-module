import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The quotes module (task 6.6, spec/07): schema-driven requests → priced
 * quotes → signed accept link → optional deposit → convert to order or
 * appointment. `QuoteEvent` records every transition. */
export default defineModule({
  key: "quotes",
  name: "Quotes",
  version: "1.0.0",
  stage: "stable",
  models: ["QuoteRequest", "Quote", "QuoteLine", "QuoteEvent"],
  dashboard: { nav: [{ href: "quotes", label: "Quotes", icon: "file-text" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [requests, quotes] = await Promise.all([
        tenantDb(ctx, (db) => db.QuoteRequest.all()),
        tenantDb(ctx, (db) => db.Quote.all()),
      ])
      return { "quotes.requests": requests.length, "quotes.quotes": quotes.length }
    },
    onExport: async (ctx: TenantContext) => {
      const [requests, quotes, lines, events] = await Promise.all([
        tenantDb(ctx, (db) => db.QuoteRequest.all()),
        tenantDb(ctx, (db) => db.Quote.all()),
        tenantDb(ctx, (db) => db.QuoteLine.all()),
        tenantDb(ctx, (db) => db.QuoteEvent.all()),
      ])
      return {
        "quotes.requests.json": JSON.stringify(requests, null, 2),
        "quotes.quotes.json": JSON.stringify(quotes, null, 2),
        "quotes.lines.json": JSON.stringify(lines, null, 2),
        "quotes.events.json": JSON.stringify(events, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const events = await tenantDb(ctx, (db) => db.QuoteEvent.select("id").all())
      for (const row of (events as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.QuoteEvent.where({ id: row.id }).delete())
      }
      left += (events as { id: string }[]).length - Math.min(batch, (events as { id: string }[]).length)
      const lines = await tenantDb(ctx, (db) => db.QuoteLine.select("id").all())
      for (const row of (lines as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.QuoteLine.where({ id: row.id }).delete())
      }
      left += (lines as { id: string }[]).length - Math.min(batch, (lines as { id: string }[]).length)
      const quotes = await tenantDb(ctx, (db) => db.Quote.select("id").all())
      for (const row of (quotes as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Quote.where({ id: row.id }).delete())
      }
      left += (quotes as { id: string }[]).length - Math.min(batch, (quotes as { id: string }[]).length)
      const requests = await tenantDb(ctx, (db) => db.QuoteRequest.select("id").all())
      for (const row of (requests as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.QuoteRequest.where({ id: row.id }).delete())
      }
      left += (requests as { id: string }[]).length - Math.min(batch, (requests as { id: string }[]).length)
      return left
    },
  },
})
