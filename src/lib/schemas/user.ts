import { z } from "zod"

/**
 * A user's editable profile, for both the browser form and the server action
 * (which parses it again). Messages come from the caller's translations, as in
 * `project.ts`.
 */
export type UserMessages = { nameRequired: string; nameTooLong: string }

export const USER_NAME_MAX = 50

export function userSchema(m: UserMessages) {
  return z.object({
    name: z.string().trim().min(1, m.nameRequired).max(USER_NAME_MAX, m.nameTooLong),
  })
}

export type UserInput = z.infer<ReturnType<typeof userSchema>>
