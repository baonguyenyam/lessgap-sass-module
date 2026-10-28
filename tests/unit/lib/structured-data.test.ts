import { describe, expect, it } from "vitest"
import { localBusinessJsonLd } from "@/lib/structured-data"

describe("localBusinessJsonLd (3.6)", () => {
  it("builds a LocalBusiness schema.org object from the profile", () => {
    const ld = localBusinessJsonLd({
      name: "Fixture Co",
      tagline: "A fixture business",
      phone: "+1 555 0100",
      email: "hi@fixture.co",
      address: "1 Main St",
      origin: "https://fixture.lessgap.io",
      logo: "https://fixture.lessgap.io/logo.png",
    })
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Fixture Co",
      description: "A fixture business",
      telephone: "+1 555 0100",
      email: "hi@fixture.co",
      address: "1 Main St",
      url: "https://fixture.lessgap.io",
      image: "https://fixture.lessgap.io/logo.png",
    })
  })

  it("omits missing fields — no empty strings in JSON-LD", () => {
    const ld = localBusinessJsonLd({ name: "Minimal", origin: "https://x.io" })
    expect(ld).not.toHaveProperty("description")
    expect(ld).not.toHaveProperty("telephone")
    expect(ld).not.toHaveProperty("image")
    expect(ld["@type"]).toBe("LocalBusiness")
  })
})
