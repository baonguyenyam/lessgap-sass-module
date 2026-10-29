/** Text chunking (task 7.2, spec/08): split a source's text on headings and
 * paragraphs into chunks under a token cap. A token ≈ 4 characters — close
 * enough for a knowledge base of pages, FAQs and docs. */
export const TOKENS_PER_CHAR = 0.25
export const DEFAULT_MAX_TOKENS = 400

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length * TOKENS_PER_CHAR))
}

export function chunkText(text: string, maxTokens = DEFAULT_MAX_TOKENS): string[] {
  const maxChars = Math.floor(maxTokens / TOKENS_PER_CHAR)
  const blocks = text
    .split(/\n{2,}|(?=^#{1,6}\s)/m)
    .map((b) => b.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let current = ""
  for (const block of blocks) {
    if (block.length > maxChars) {
      // A block bigger than the cap splits hard on newlines/length.
      for (const piece of block.match(new RegExp(`[^]{1,${maxChars}}`, "g")) ?? []) {
        if (current) chunks.push(current)
        current = piece
      }
      continue
    }
    if (current && current.length + block.length + 2 > maxChars) {
      chunks.push(current)
      current = block
    } else {
      current = current ? `${current}\n\n${block}` : block
    }
  }
  if (current) chunks.push(current)
  return chunks
}
