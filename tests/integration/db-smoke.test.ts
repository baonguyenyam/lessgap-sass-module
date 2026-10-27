import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { createUser } from "@tests/factories"

describe("database integration", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("inserts and reads a kit user", async () => {
    const user = await createUser({ name: "Integration User", email: "integration@example.test" })
    const found = await db8.orm.public.User.where({ id: user.id }).first()

    expect(found?.email).toBe(user.email)
  })
})
