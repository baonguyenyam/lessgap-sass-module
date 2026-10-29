import { NextRequest, NextResponse } from "next/server"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { systemContext } from "@/platform/tenancy/context"
import { resolveHost } from "@/platform/tenancy/host"
import { answerChat } from "@/platform/chatbot/answer"

/** The chat endpoint (task 7.3): POST {question, visitorKey} — the site
 * bubble calls it; the `chatbot` module + `feature.chatbot` switch gate it. */
export async function POST(req: NextRequest) {
  const resolved = await resolveHost(req.headers.get("host") ?? "")
  if (resolved.kind !== "site") return NextResponse.json({ error: "not_found" }, { status: 404 })
  const c = systemContext(resolved.tenantId, "customer")
  try {
    await requireModule(c, "chatbot")
    const featureOff = await db8.orm.public.PlatformSwitch.where({ key: "feature.chatbot" }).first()
    if (featureOff?.value === false) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    const body = (await req.json()) as { question?: string; visitorKey?: string }
    if (!body.question?.trim() || !body.visitorKey) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    }
    const result = await answerChat(c, { question: body.question, visitorKey: body.visitorKey })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "limit_reached" ? 429 : 400 })
    }
    throw error
  }
}
