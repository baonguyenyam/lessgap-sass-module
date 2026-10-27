import { describe, expect, it } from "vitest"

import { objectUrl, parseListObjects, readStorageConfig } from "@/platform/storage/config"

const full = { R2_ACCESS_KEY_ID: "key", R2_SECRET_ACCESS_KEY: "secret", R2_BUCKET: "app", R2_ACCOUNT_ID: "acc" }

describe("readStorageConfig", () => {
  it("builds the endpoint from the account id", () => {
    expect(readStorageConfig(full)?.endpoint).toBe("https://acc.r2.cloudflarestorage.com")
  })

  it("prefers an explicit endpoint and drops its trailing slash", () => {
    expect(readStorageConfig({ ...full, R2_ENDPOINT: "https://example.test/" })?.endpoint).toBe("https://example.test")
  })

  it("is off when any required value is blank, as .env.example ships them", () => {
    expect(readStorageConfig({ ...full, R2_BUCKET: "" })).toBeNull()
    expect(readStorageConfig({ ...full, R2_ACCOUNT_ID: "" })).toBeNull()
    expect(readStorageConfig({})).toBeNull()
  })
})

describe("objectUrl", () => {
  it("is path style and encodes each key segment, not the slashes", () => {
    const config = readStorageConfig(full)!
    expect(objectUrl(config, "platform-backups/a b.sql.gz")).toBe(
      "https://acc.r2.cloudflarestorage.com/app/platform-backups/a%20b.sql.gz"
    )
  })
})

describe("parseListObjects", () => {
  it("reads keys, sizes and dates, and the next page token", () => {
    const xml = `<?xml version="1.0"?><ListBucketResult><IsTruncated>true</IsTruncated>
      <Contents><Key>platform-backups/x&amp;y.sql.gz</Key><Size>1024</Size><LastModified>2026-10-27T19:50:07.000Z</LastModified></Contents>
      <NextContinuationToken>abc</NextContinuationToken></ListBucketResult>`
    const page = parseListObjects(xml)
    expect(page.objects).toEqual([
      { key: "platform-backups/x&y.sql.gz", size: 1024, lastModified: new Date("2026-10-27T19:50:07.000Z") },
    ])
    expect(page.next).toBe("abc")
  })

  it("has no next page when the listing is complete", () => {
    expect(parseListObjects("<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>").next).toBeNull()
  })
})
