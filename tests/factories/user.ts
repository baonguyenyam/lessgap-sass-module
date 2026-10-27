import { db8, type Row } from "@/lib/db8"
import { newId } from "@/lib/ids"

export type UserFactoryInput = {
  name?: string
  email?: string
}

/** Creates the smallest valid kit user for integration tests and seeds. */
export async function createUser(overrides: UserFactoryInput = {}): Promise<Row<"User">> {
  return db8.orm.public.User.create({
    name: overrides.name ?? "Test User",
    email: overrides.email ?? `user-${newId()}@example.test`,
  })
}
