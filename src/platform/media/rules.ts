/**
 * Upload rules (task 3.4, spec/16-operations): the platform console writes
 * `upload.types` (comma-separated MIME prefixes) and `upload.max_mb`; the
 * server enforces them before an upload is signed and again after it
 * completes — a signed URL proves nothing about the bytes that arrived.
 */
export type UploadRules = { types: string[]; maxMb: number }

export function checkUploadRules(rules: UploadRules, contentType: string, bytes: number): { error?: string } {
  const type = contentType.trim().toLowerCase()
  if (!type) return { error: "content_type" }
  if (
    !rules.types.some(
      (allowed) => type === allowed || type.startsWith(allowed.endsWith("/*") ? allowed.slice(0, -1) : allowed + "/")
    )
  ) {
    return { error: "type" }
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > rules.maxMb * 1024 * 1024) {
    return { error: "size" }
  }
  return {}
}
