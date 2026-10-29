import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The chatbot module (task 7.2, spec/08): a retrieval-augmented bubble on
 * the tenant's site — sources, chunks, conversations. The platform's
 * `feature.chatbot` switch is the kill switch alongside this module. */
export default defineModule({
  key: "chatbot",
  name: "Chatbot",
  version: "1.0.0",
  stage: "stable",
  models: ["KnowledgeSource", "KnowledgeChunk", "ChatConversation", "ChatMessage"],
  dashboard: { nav: [{ href: "chatbot", label: "Chatbot", icon: "message-circle" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [sources, chunks, conversations] = await Promise.all([
        tenantDb(ctx, (db) => db.KnowledgeSource.all()),
        tenantDb(ctx, (db) => db.KnowledgeChunk.all()),
        tenantDb(ctx, (db) => db.ChatConversation.all()),
      ])
      return {
        "chatbot.sources": sources.length,
        "chatbot.chunks": chunks.length,
        "chatbot.conversations": conversations.length,
      }
    },
    onExport: async (ctx: TenantContext) => {
      const [sources, chunks, conversations, messages] = await Promise.all([
        tenantDb(ctx, (db) => db.KnowledgeSource.all()),
        tenantDb(ctx, (db) => db.KnowledgeChunk.all()),
        tenantDb(ctx, (db) => db.ChatConversation.all()),
        tenantDb(ctx, (db) => db.ChatMessage.all()),
      ])
      return {
        "chatbot.sources.json": JSON.stringify(sources, null, 2),
        "chatbot.chunks.json": JSON.stringify(chunks, null, 2),
        "chatbot.conversations.json": JSON.stringify(conversations, null, 2),
        "chatbot.messages.json": JSON.stringify(messages, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const messages = await tenantDb(ctx, (db) => db.ChatMessage.select("id").all())
      for (const row of (messages as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ChatMessage.where({ id: row.id }).delete())
      }
      left += (messages as { id: string }[]).length - Math.min(batch, (messages as { id: string }[]).length)
      const conversations = await tenantDb(ctx, (db) => db.ChatConversation.select("id").all())
      for (const row of (conversations as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ChatConversation.where({ id: row.id }).delete())
      }
      left += (conversations as { id: string }[]).length - Math.min(batch, (conversations as { id: string }[]).length)
      const chunks = await tenantDb(ctx, (db) => db.KnowledgeChunk.select("id").all())
      for (const row of (chunks as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.KnowledgeChunk.where({ id: row.id }).delete())
      }
      left += (chunks as { id: string }[]).length - Math.min(batch, (chunks as { id: string }[]).length)
      const sources = await tenantDb(ctx, (db) => db.KnowledgeSource.select("id").all())
      for (const row of (sources as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.KnowledgeSource.where({ id: row.id }).delete())
      }
      left += (sources as { id: string }[]).length - Math.min(batch, (sources as { id: string }[]).length)
      return left
    },
  },
})
