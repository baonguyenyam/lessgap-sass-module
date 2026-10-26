import { cuid2 } from "uniku/cuid2"
import { nanoid } from "uniku/nanoid"
import { uuidv7 } from "uniku/uuid/v7"

/**
 * The only place application code makes an identifier
 * (spec/adr/0013-identifier-strategy.md).
 *
 * The generators are uniku's, the library Prisma 8 itself uses for
 * `@onCreate(cuid(2))`, `@onCreate(uuid(7))` and `@onCreate(nanoid(n))`, so an
 * id made here and one the ORM makes have the same format. Prefer letting the
 * contract generate ids; call these when the id is needed before the row is
 * written (a job payload, an idempotency key, a URL built before insert).
 *
 * | Kind            | Use for                                                     | Never for                    |
 * | --------------- | ----------------------------------------------------------- | ---------------------------- |
 * | `newId`         | primary keys of business records (users, tenants, bookings) | anything a person types      |
 * | `newTimeId`     | append-only, high-volume rows ordered by time (audit, jobs, events, logs) | ids that must not reveal when they were made |
 * | `newPublicCode` | short codes people read, say or type (booking ref, invite code) | secrets                  |
 * | `newUrlToken`   | unguessable values in URLs (share links, unsubscribe links) | primary keys                 |
 *
 * Secrets that grant access by themselves (sign-in links, password resets)
 * are Better Auth's, not these.
 */

/** CUID2: non-sequential, resists enumeration, safe to show in URLs. 24 characters. */
export function newId(): string {
  return cuid2()
}

/** UUID v7: time-ordered, so B-tree inserts stay local on large append-only tables. */
export function newTimeId(): string {
  return uuidv7()
}

/**
 * Upper-case letters and digits without the ones people confuse when reading
 * aloud or typing (0/O, 1/I/L): 31 characters.
 */
export const PUBLIC_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

/**
 * A short code for people: booking references, invite codes. Not a secret and
 * not unique by itself: store it with a unique constraint scoped to the
 * tenant, and retry on conflict. 8 characters ≈ 8.5 × 10^11 values.
 */
export function newPublicCode(length = 8): string {
  if (!Number.isInteger(length) || length < 6 || length > 32) {
    throw new RangeError("a public code is 6 to 32 characters")
  }
  return nanoid({ alphabet: PUBLIC_CODE_ALPHABET, length })
}

/** A URL-safe random token, 21 characters (126 bits) by default. */
export function newUrlToken(length = 21): string {
  if (!Number.isInteger(length) || length < 16) throw new RangeError("a URL token is at least 16 characters")
  return nanoid(length)
}

export const isId = (value: unknown): value is string => cuid2.isValid(value)
export const isTimeId = (value: unknown): value is string => uuidv7.isValid(value)
export const isPublicCode = (value: unknown, length = 8): value is string =>
  typeof value === "string" && value.length === length && [...value].every((c) => PUBLIC_CODE_ALPHABET.includes(c))
