import { AwsClient } from "aws4fetch"
import {
  objectUrl,
  parseListObjects,
  readStorageConfig,
  type StorageConfig,
  type StoredObject,
} from "@/platform/storage/config"

/**
 * The one module that talks to the R2 bucket (spec/adr/0018, 0023): put, list
 * and a presigned download. Requests are signed with SigV4 by `aws4fetch`;
 * the bucket stays private.
 */

export type { StoredObject }

/** Whether the bucket is configured; the callers show why a feature is off when it is not. */
export function storageConfigured(): boolean {
  return readStorageConfig(process.env) !== null
}

function connect(): { config: StorageConfig; client: AwsClient } {
  const config = readStorageConfig(process.env)
  if (!config) throw new Error("R2 storage is not configured (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)")
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  })
  return { config, client }
}

async function ok(response: Response, what: string): Promise<Response> {
  if (response.ok) return response
  // The body is S3's XML error; its code is enough for the server log.
  const code = /<Code>([^<]+)<\/Code>/.exec(await response.text())?.[1] ?? "unknown"
  throw new Error(`R2 ${what} failed: ${response.status} ${code}`)
}

/** Stores one object. `metadata` becomes `x-amz-meta-*` headers (ASCII values). */
export async function putObject(
  key: string,
  body: Uint8Array,
  options: { contentType: string; metadata?: Record<string, string> }
): Promise<void> {
  const { config, client } = connect()
  const headers: Record<string, string> = { "content-type": options.contentType }
  for (const [name, value] of Object.entries(options.metadata ?? {})) headers[`x-amz-meta-${name}`] = value
  await ok(await client.fetch(objectUrl(config, key), { method: "PUT", body: body as BodyInit, headers }), `put ${key}`)
}

/** Every object under a prefix, newest first. */
export async function listObjects(prefix: string): Promise<StoredObject[]> {
  const { config, client } = connect()
  const objects: StoredObject[] = []
  let token: string | null = null
  do {
    const url = new URL(`${config.endpoint}/${encodeURIComponent(config.bucket)}`)
    url.searchParams.set("list-type", "2")
    url.searchParams.set("prefix", prefix)
    if (token) url.searchParams.set("continuation-token", token)
    const page = parseListObjects(await (await ok(await client.fetch(url.toString()), "list")).text())
    objects.push(...page.objects)
    token = page.next
  } while (token)
  return objects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
}

/** A GET link for one object, valid for `seconds`, that downloads under `filename`. */
export async function presignDownload(key: string, filename: string, seconds = 300): Promise<string> {
  const { config, client } = connect()
  const url = new URL(objectUrl(config, key))
  url.searchParams.set("X-Amz-Expires", String(seconds))
  url.searchParams.set("response-content-disposition", `attachment; filename="${filename.replaceAll('"', "")}"`)
  const signed = await client.sign(url.toString(), { method: "GET", aws: { signQuery: true } })
  return signed.url
}

/** A PUT link for one object, valid for `seconds` — the upload rules were
 * already checked before this is signed; `confirmUpload` re-checks them when
 * the bytes arrive (task 3.4). */
export async function presignUpload(key: string, contentType: string, seconds = 300): Promise<string> {
  const { config, client } = connect()
  const url = new URL(objectUrl(config, key))
  url.searchParams.set("X-Amz-Expires", String(seconds))
  const signed = await client.sign(url.toString(), {
    method: "PUT",
    headers: { "content-type": contentType },
    aws: { signQuery: true },
  })
  return signed.url
}
