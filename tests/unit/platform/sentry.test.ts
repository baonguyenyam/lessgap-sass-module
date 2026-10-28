import { describe, expect, it } from "vitest"

import { scrubEvent, sentryEnabled } from "@/platform/sentry"

describe("sentryEnabled", () => {
  it("is off without a DSN, so local and preview send nothing", () => {
    expect(sentryEnabled({})).toBe(false)
    expect(sentryEnabled({ SENTRY_DSN: " " })).toBe(false)
    expect(sentryEnabled({ SENTRY_DSN: "https://key@o1.ingest.sentry.io/1" })).toBe(true)
  })
})

describe("scrubEvent (beforeSend)", () => {
  it("sends the error and allowed tags, never the person or the request", () => {
    const event = scrubEvent({
      message: "mail to person@example.com failed",
      request: { headers: { cookie: "session=secret" }, data: "body" },
      user: { id: "u1", email: "person@example.com" },
      breadcrumbs: [{ message: "clicked" }],
      extra: { password: "x" },
      contexts: { runtime: { name: "node" }, browser: { name: "Chrome" } },
      tags: { requestId: "r1", tenantId: "t1", userId: "u1", email: "person@example.com" },
      exception: { values: [{ type: "Error", value: "no inbox for other@example.org" }] },
    })
    expect(event).toEqual({
      message: "mail to [address] failed",
      contexts: { runtime: { name: "node" }, os: undefined, trace: undefined },
      tags: { requestId: "r1", tenantId: "t1" },
      exception: { values: [{ type: "Error", value: "no inbox for [address]" }] },
    })
  })

  it("drops an event it cannot scrub instead of sending it raw", () => {
    const hostile = {
      get message(): string {
        throw new Error("getter")
      },
    }
    expect(scrubEvent(hostile)).toBeNull()
  })
})
