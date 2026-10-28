import { describe, expect, it } from "vitest"

import { ownerUrl, toDirectUrl, withoutNeonPooler } from "@/lib/database-url"

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

describe("ownerUrl", () => {
  it("prefers the migrate URL, then the direct one, then DATABASE_URL, on the direct host", () => {
    const neon = "postgresql://u:p@ep-a-pooler.eu.aws.neon.tech/db"
    expect(ownerUrl({ DATABASE_URL: neon })).toBe("postgresql://u:p@ep-a.eu.aws.neon.tech/db")
    expect(ownerUrl({ DATABASE_URL: neon, DIRECT_URL: "postgresql://d@h/db" })).toBe("postgresql://d@h/db")
    expect(
      ownerUrl({ DATABASE_URL: neon, DIRECT_URL: "postgresql://d@h/db", DATABASE_URL_MIGRATE: "postgresql://o@h/db" })
    ).toBe("postgresql://o@h/db")
  })

  it("treats blanks as unset and returns null without any URL", () => {
    expect(ownerUrl({ DATABASE_URL_MIGRATE: " ", DATABASE_URL: "postgresql://a@h/db" })).toBe("postgresql://a@h/db")
    expect(ownerUrl({})).toBeNull()
  })
})
