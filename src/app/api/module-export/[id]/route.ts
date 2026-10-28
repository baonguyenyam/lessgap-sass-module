import { NextResponse, type NextRequest } from "next/server"
import { db8 } from "@/lib/db8"
import { getCurrentUser } from "@/lib/auth"
import { toDate } from "@/lib/timestamps"

/**
 * A module export download (task 2.10, spec/15): the tenant's own rows, JSON.
 * The link lives for 7 days — after `expiresAt` it is gone, and it never
 * serves another tenant's export: the member check is on the row's tenant.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const row = await db8.orm.public.ModuleExport.where({ id }).first()
  if (!row || toDate(row.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const member = await db8.orm.public.Member.where({ organizationId: row.tenantId, userId: user.id }).first()
  const staff = await db8.orm.public.User.select("platformRole").where({ id: user.id }).first()
  if (!member && !staff?.platformRole) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(JSON.stringify(row.files, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${row.moduleKey}-export.json"`,
    },
  })
}
