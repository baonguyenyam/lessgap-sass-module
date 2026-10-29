import { createHash } from "node:crypto"
import { db8 } from "@/lib/db8"
import { chunkText, estimateTokens } from "@/lib/chatbot/chunk"
import { getChatProvider } from "@/platform/chatbot/provider"

/** The ingest pipeline (task 7.2, spec/08): a tenant's prose — site pages,
 * its `chatbot.faq` entries, uploaded documents — is chunked, embedded and
 * stored in `KnowledgeSource`/`KnowledgeChunk`. A source is keyed by its
 * checksum: unchanged → no-op, changed → re-embed. Facts that must be
 * exact (prices, hours, slots) never enter this index — tools read those
 * live at answer time. */
type IngestItem = { type: string; title: string; text: string }

function checksumOf(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32)
}

async function collectSources(tenantId: string): Promise<IngestItem[]> {
  const [pages, faqRow] = await Promise.all([
    db8.orm.public.Page.where({ tenantId, status: "published" }).all(),
    db8.orm.public.TenantSetting.where({ tenantId, key: "chatbot.faq" }).first(),
  ])
  const items: IngestItem[] = []
  for (const page of pages) {
    const content = typeof page.content === "string" ? page.content : JSON.stringify(page.content ?? "")
    if (content.trim()) items.push({ type: "page", title: page.title ?? page.key, text: content })
  }
  if (Array.isArray(faqRow?.value)) {
    for (const [i, f] of (faqRow.value as { q: string; a: string }[]).entries()) {
      items.push({ type: "faq", title: `FAQ ${i + 1}: ${f.q}`, text: `${f.q}\n${f.a}` })
    }
  }
  return items
}

/** Re-index one tenant's sources — the job handler and the save/upload
 * hooks call this. Idempotent per source checksum. */
export async function reindexTenant(tenantId: string): Promise<{ sources: number; chunks: number }> {
  // L2: a disabled module's jobs pause — the scheduled reindex no-ops
  // until the tenant re-enables chatbot.
  const tm = await db8.orm.public.TenantModule.where({ tenantId, moduleKey: "chatbot", enabled: true }).first()
  if (!tm) return { sources: 0, chunks: 0 }
  const provider = getChatProvider()
  const items = await collectSources(tenantId)
  let chunks = 0
  for (const item of items) {
    const checksum = checksumOf(item.text)
    const existing = await db8.orm.public.KnowledgeSource.where({
      tenantId,
      type: item.type,
      title: item.title,
    }).first()
    if (existing?.checksum === checksum && existing.embeddingModel === provider.embeddingModel) continue
    if (existing) {
      await db8.orm.public.KnowledgeSource.where({ id: existing.id }).update({
        checksum,
        embeddingModel: provider.embeddingModel,
        status: "active",
      })
    } else {
      await db8.orm.public.KnowledgeSource.create({
        tenantId,
        type: item.type,
        title: item.title,
        checksum,
        embeddingModel: provider.embeddingModel,
      })
    }
    const sourceId =
      existing?.id ??
      (await db8.orm.public.KnowledgeSource.where({ tenantId, type: item.type, title: item.title }).first())!.id
    await db8.orm.public.KnowledgeChunk.where({ tenantId, sourceId }).delete()
    for (const chunk of chunkText(item.text)) {
      await db8.orm.public.KnowledgeChunk.create({
        tenantId,
        sourceId,
        content: chunk,
        tokenCount: estimateTokens(chunk),
        embedding: await provider.embed(chunk),
      })
      chunks++
    }
  }
  return { sources: items.length, chunks }
}
