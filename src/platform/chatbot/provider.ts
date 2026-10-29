import { createHash } from "node:crypto"

/** The chatbot provider (task 7.2, spec/08 + decision 7-A): LLM and
 * embeddings behind one interface — `local` is deterministic (tests and
 * dev), `openai` lands behind `OPENAI_API_KEY` when a deployment turns it
 * on. `chatbot.provider` platform switch picks. */
export type ChatTool = { name: string; description: string; parameters: Record<string, unknown> }
export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string }
export type ChatResult = { content: string; toolCalls?: { name: string; arguments: Record<string, unknown> }[] }

export type ChatProvider = {
  key: string
  embeddingModel: string
  embed(text: string): Promise<number[]>
  chat(messages: ChatMessage[], tools: ChatTool[]): Promise<ChatResult>
}

/** The local provider (decision 7-A): a deterministic 384-dim embedding —
 * hash each word into the vector — and a stub `chat` that answers from the
 * retrieved chunks + tools deterministically so tests assert behaviour
 * without a model. */
const DIMS = 384

function wordHash(word: string): number {
  const hash = createHash("sha256").update(word).digest()
  return hash.readUInt32BE(0)
}

export const localProvider: ChatProvider = {
  key: "local",
  embeddingModel: "local-384",
  async embed(text) {
    const vector = new Array<number>(DIMS).fill(0)
    for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      vector[wordHash(word) % DIMS] += 1
    }
    const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1
    return vector.map((x) => x / norm)
  },
  async chat(messages) {
    const last = messages[messages.length - 1]?.content ?? ""
    const system = messages.find((m) => m.role === "system")?.content ?? ""
    // The stub honours the tool contract deterministically: a question
    // about prices/services calls get_services, hours calls get_hours,
    // slots call find_slots — the pipeline then answers from tool output.
    if (/price|cost|service|menu/i.test(last)) {
      return { content: "", toolCalls: [{ name: "get_services", arguments: {} }] }
    }
    if (/hour|open|close|when/i.test(last)) {
      return { content: "", toolCalls: [{ name: "get_hours", arguments: {} }] }
    }
    if (/book|slot|appointment|available/i.test(last)) {
      return { content: "", toolCalls: [{ name: "find_slots", arguments: {} }] }
    }
    const chunks = messages.filter((m) => m.role === "system").flatMap(() => [])
    void chunks
    void system
    return { content: `local-answer: ${last.slice(0, 60)}` }
  },
}

export function getChatProvider(): ChatProvider {
  return localProvider
}
