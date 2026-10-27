/**
 * Where the R2 bucket is, read from the environment (spec/adr/0018). Pure, so
 * the rules are tested; `r2.ts` is the only module that uses the result.
 */

export type StorageConfig = {
  /** `https://<account>.r2.cloudflarestorage.com`, without a trailing slash. */
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

type EnvSource = Record<string, string | undefined>

/** The bucket settings, or null when storage is not configured. Blank means unset, as in `.env.example`. */
export function readStorageConfig(env: EnvSource): StorageConfig | null {
  const get = (name: string) => (env[name] ?? "").trim() || null
  const accessKeyId = get("R2_ACCESS_KEY_ID")
  const secretAccessKey = get("R2_SECRET_ACCESS_KEY")
  const bucket = get("R2_BUCKET")
  const accountId = get("R2_ACCOUNT_ID")
  const endpoint = get("R2_ENDPOINT") ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null)
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return null
  return { endpoint: endpoint.replace(/\/+$/, ""), bucket, accessKeyId, secretAccessKey }
}

/** The URL of one object, path style, each key segment encoded. */
export function objectUrl(config: StorageConfig, key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/")
  return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${path}`
}

export type StoredObject = { key: string; size: number; lastModified: Date }

/** The objects and the continuation token in one ListObjectsV2 response. */
export function parseListObjects(xml: string): { objects: StoredObject[]; next: string | null } {
  const text = (block: string, tag: string) => {
    const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)
    return match ? decodeXml(match[1]) : null
  }
  const objects: StoredObject[] = []
  for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = text(match[1], "Key")
    if (!key) continue
    objects.push({
      key,
      size: Number(text(match[1], "Size") ?? 0),
      lastModified: new Date(text(match[1], "LastModified") ?? 0),
    })
  }
  const truncated = text(xml, "IsTruncated") === "true"
  return { objects, next: truncated ? text(xml, "NextContinuationToken") : null }
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
}
