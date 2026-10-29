import { NextRequest, NextResponse } from "next/server"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { resolveHost } from "@/platform/tenancy/host"
import { AppError } from "@/platform/errors"

/** The page-view beacon (task 8.7): the site page's tracker POSTs here;
 * one `SitePageView` row per tenant+path+day upserts — the counter, not a
 * log line. */
export async function POST(req: NextRequest) {
  const resolved = await resolveHost(req.headers.get("host") ?? "")
  if (resolved.kind !== "site") return NextResponse.json({ error: "not_found" }, { status: 404 })
  const c = systemContext(resolved.tenantId, "customer")
  try {
    await requireModule(c, "analytics")
    const body = (await req.json().catch(() => ({}))) as { path?: string }
    const path = (body.path ?? "/").slice(0, 200)
    const date = new Date().toISOString().slice(0, 10)
    const existing = await db8.orm.public.SitePageView.where({ tenantId: resolved.tenantId, path, date }).first()
    if (existing) {
      await db8.orm.public.SitePageView.where({ id: existing.id }).update({ count: existing.count + 1 })
    } else {
      await db8.orm.public.SitePageView.create({ tenantId: resolved.tenantId, path, date, count: 1 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code }, { status: 403 })
    throw error
  }
}
