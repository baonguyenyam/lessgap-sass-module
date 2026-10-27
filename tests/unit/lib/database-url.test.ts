import { describe, expect, it } from "vitest"

import { toDirectUrl, withoutNeonPooler } from "@/lib/database-url"

describe("toDirectUrl", () => {
  it("switches a Neon pooler host to the direct host of the same endpoint", () => {
    expect(toDirectUrl("postgresql://u:p@ep-a-b-pooler.eu.aws.neon.tech/db")).toBe(
      "postgresql://u:p@ep-a-b.eu.aws.neon.tech/db"
    )
  })

  it("leaves other hosts and non-URLs alone", () => {
    expect(toDirectUrl("postgresql://u:p@localhost:5432/x")).toBe("postgresql://u:p@localhost:5432/x")
    expect(toDirectUrl("not a url")).toBe("not a url")
    expect(withoutNeonPooler("my-pooler.example.com")).toBe("my-pooler.example.com")
  })
})
