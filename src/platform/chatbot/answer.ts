import { db8 } from "@/lib/db8"
import { consumeLimit } from "@/platform/entitlements/usage"
import { getChatProvider, type ChatMessage } from "@/platform/chatbot/provider"
import { buildSystemPrompt, PROMPT_VERSION } from "@/platform/chatbot/prompt"
import { availableSlots } from "@/lib/availability"
import type { TenantContext } from "@/platform/tenancy/context"

/** The answer pipeline (task 7.3, spec/08): rate-limit → prompt → retrieve
 * (tenantId first, then cosine distance) → provider + tools → answer →
 * log the conversation. Facts come from tools, prose from chunks. */
export type ChatAnswer = {
  answer: string
  sources: string[]
  conversationId: string
}

const TOOLS = [
  { name: "get_services", description: "Services and prices from the catalog", parameters: {} },
  { name: "get_hours", description: "Opening hours from the site settings", parameters: {} },
  { name: "find_slots", description: "Free booking slots in a range", parameters: {} },
  { name: "start_booking", description: "Hand the customer to the booking flow", parameters: {} },
  { name: "start_quote", description: "Hand the customer to the quote form", parameters: {} },
  { name: "leave_message", description: "Take a message for the business", parameters: {} },
]

function cosine(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length && i < b.length; i++) dot += a[i]! * b[i]!
  return dot
}

async function toolOutput(ctx: TenantContext, name: string): Promise<string> {
  switch (name) {
    case "get_services": {
      const services = await db8.orm.public.Service.where({ tenantId: ctx.tenantId, status: "active" }).all()
      return services.map((s) => `${s.name} — ${(s.priceCents / 100).toFixed(2)}`).join("; ") || "no services"
    }
    case "get_hours": {
      const settings = await db8.orm.public.SiteSettings.where({ tenantId: ctx.tenantId }).first()
      return JSON.stringify(settings?.hours ?? {})
    }
    case "find_slots": {
      const [rules, timeOff, existing] = await Promise.all([
        db8.orm.public.AvailabilityRule.where({ tenantId: ctx.tenantId }).all(),
        db8.orm.public.TimeOff.where({ tenantId: ctx.tenantId }).all(),
        db8.orm.public.Appointment.where({ tenantId: ctx.tenantId }).all(),
      ])
      const now = new Date()
      const slots = availableSlots(
        rules.map((r) => ({
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          staffId: r.staffId,
          resourceId: r.resourceId,
        })),
        timeOff.map((t) => ({ staffId: t.staffId, resourceId: t.resourceId, startTs: t.startTs, endTs: t.endTs })),
        existing.map((a) => ({
          staffId: a.staffId,
          resourceId: a.resourceId,
          startTs: a.startTs,
          endTs: a.endTs,
          status: a.status,
        })),
        { durationMinutes: 30 },
        "any",
        { startTs: now.toISOString(), endTs: new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString() },
        "UTC"
      )
      return (
        slots
          .slice(0, 5)
          .map((s) => s.startTs)
          .join("; ") || "no slots"
      )
    }
    case "start_booking":
      return "handoff: /book"
    case "start_quote":
      return "handoff: /quote"
    case "leave_message":
      return "handoff: message"
    default:
      return "unknown tool"
  }
}

export async function answerChat(
  ctx: TenantContext,
  input: { question: string; visitorKey: string }
): Promise<ChatAnswer> {
  // 1. Rate-limit — the tenant's monthly message cap.
  await consumeLimit(ctx, "chatbot.messages.monthly", 1)
  const provider = getChatProvider()

  // 2. Tenant settings + chatbot settings build the prompt.
  const [tenant, settings, promptOverride] = await Promise.all([
    db8.orm.public.Tenant.where({ id: ctx.tenantId }).first(),
    db8.orm.public.SiteSettings.where({ tenantId: ctx.tenantId }).first(),
    db8.orm.public.TenantSetting.where({ tenantId: ctx.tenantId, key: `chatbot.prompt.${PROMPT_VERSION}` }).first(),
  ])
  const chatbotSettings = await db8.orm.public.TenantSetting.where({
    tenantId: ctx.tenantId,
    key: "chatbot.settings",
  }).first()
  const chatbot =
    typeof chatbotSettings?.value === "object" && chatbotSettings.value !== null
      ? (chatbotSettings.value as { tone?: string; languages?: string[] })
      : {}

  // 3. Retrieve top chunks — tenantId first, then cosine distance.
  const questionVector = await provider.embed(input.question)
  const chunks = await db8.orm.public.KnowledgeChunk.where({ tenantId: ctx.tenantId }).include("source").all()
  const ranked = chunks
    .filter((c) => c.embedding != null)
    .map((c) => ({ chunk: c, score: cosine(questionVector, c.embedding!) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // 4. Prompt + provider call with tools — a tool answer comes from the
  // database, the prose answer from the chunks.
  const system =
    (typeof promptOverride?.value === "string" ? promptOverride.value : null) ??
    buildSystemPrompt({
      businessName: (settings?.profile as { name?: string } | null)?.name ?? tenant?.slug ?? "this business",
      tone: chatbot.tone,
      languages: chatbot.languages,
      chunks: ranked.map((r) => r.chunk.content),
    })
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: input.question },
  ]
  const result = await provider.chat(messages, TOOLS)

  // 5. Execute tool calls — the answer is the tool's data, never invented.
  let answer = result.content
  let sources = ranked.slice(0, 3).map((r) => r.chunk.source?.title ?? "source")
  const calls = result.toolCalls ?? []
  if (calls.length > 0) {
    const outputs = await Promise.all(calls.map((c) => toolOutput(ctx, c.name)))
    answer = outputs.join("\n")
    sources = calls.map((c) => c.name)
  }

  // 6. Log the conversation — the tenant's 90-day record.
  let conversation = await db8.orm.public.ChatConversation.where({
    tenantId: ctx.tenantId,
    visitorKey: input.visitorKey,
  }).first()
  if (!conversation) {
    conversation = await db8.orm.public.ChatConversation.create({
      tenantId: ctx.tenantId,
      visitorKey: input.visitorKey,
    })
  }
  await db8.orm.public.ChatMessage.create({
    tenantId: ctx.tenantId,
    conversationId: conversation.id,
    role: "user",
    content: input.question,
  })
  await db8.orm.public.ChatMessage.create({
    tenantId: ctx.tenantId,
    conversationId: conversation.id,
    role: "assistant",
    content: answer,
    sourcesJson: sources,
  })

  return { answer, sources, conversationId: conversation.id }
}
