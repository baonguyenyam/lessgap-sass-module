import { and, not, or } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import type { FieldOutputTypes, Models } from "../../generated/prisma8/contract.d"

/**
 * Prisma ORM 7-shaped facade over the Prisma ORM 8 client (`db8`).
 *
 * The migration moved the runtime to `@prisma/orm-postgres` but kept the
 * `prisma.<model>.<verb>({ where, data, ... })` call shape so the ~80 call
 * sites and their test mocks did not have to be rewritten in one step. New
 * code may use `db8` directly; over time call sites should move to the v8
 * fluent API and this facade should shrink away.
 *
 * Two semantics this layer restores on top of v8:
 * - Columns stored as `timestamp(3)` read back as `TimestampString` values
 *   ("YYYY-MM-DD HH:mm:ss.SSS"); v7 callers expect `Date`, so rows and write
 *   inputs are converted both ways here.
 * - `id`/`updatedAt` client-side generation is already handled by the
 *   contract (`@onCreate(cuid(2))` / `@onCreate(now()) @onUpdate(now())`), so
 *   create/update inputs can omit them exactly like v7.
 */

// ---------------------------------------------------------------------------
// Scalar/enum surface that used to come from `@prisma/client`.

export type Role = "USER" | "ADMIN"
export type BillingInterval = "MONTH" | "YEAR" | "ONE_TIME"
export type PurchaseStatus = "COMPLETED" | "REFUNDED"
export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "TRIALING"
  | "INCOMPLETE"

type Dated<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? (null extends T[P] ? Date | null : Date) : T[P]
}

export type User = Dated<FieldOutputTypes["public"]["User"], "createdAt" | "updatedAt" | "onboardingDismissedAt"> & {
  accounts?: Account[]
  projects?: Project[]
  purchases?: Purchase[]
  sessions?: Session[]
  subscription?: Subscription | null
  twoFactors?: TwoFactor[]
}
export type Account = Dated<
  FieldOutputTypes["public"]["Account"],
  "createdAt" | "updatedAt" | "accessTokenExpiresAt" | "refreshTokenExpiresAt"
> & { user?: User }
export type Session = Dated<FieldOutputTypes["public"]["Session"], "createdAt" | "updatedAt" | "expiresAt"> & {
  user?: User
}
export type Verification = Dated<FieldOutputTypes["public"]["Verification"], "createdAt" | "updatedAt" | "expiresAt">
export type TwoFactor = Dated<FieldOutputTypes["public"]["TwoFactor"], "createdAt" | "updatedAt" | "lockedUntil"> & {
  user?: User
}
export type Plan = Dated<FieldOutputTypes["public"]["Plan"], "createdAt" | "updatedAt"> & {
  purchases?: Purchase[]
  subscriptions?: Subscription[]
}
export type Project = Dated<FieldOutputTypes["public"]["Project"], "createdAt" | "updatedAt"> & { user?: User }
export type Subscription = Dated<
  FieldOutputTypes["public"]["Subscription"],
  "createdAt" | "updatedAt" | "currentPeriodStart" | "currentPeriodEnd" | "trialEndsAt"
> & { plan?: Plan; user?: User }
export type Purchase = Dated<FieldOutputTypes["public"]["Purchase"], "createdAt" | "updatedAt"> & {
  plan?: Plan
  user?: User
}
export type NewsletterSubscriber = Dated<
  FieldOutputTypes["public"]["NewsletterSubscriber"],
  "createdAt" | "confirmedAt" | "unsubscribedAt"
>

// ---------------------------------------------------------------------------
// Value conversion between JS `Date` and the `TimestampString` codec
// ("YYYY-MM-DD HH:mm:ss.SSS", UTC, no zone designator).

export function toTs(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, -1)
  return value
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  return new Date(value.replace(" ", "T") + "Z")
}

const DATE_FIELDS: Record<string, readonly string[]> = {
  User: ["createdAt", "updatedAt", "onboardingDismissedAt"],
  Account: ["createdAt", "updatedAt", "accessTokenExpiresAt", "refreshTokenExpiresAt"],
  NewsletterSubscriber: ["createdAt", "confirmedAt", "unsubscribedAt"],
  Plan: ["createdAt", "updatedAt"],
  Project: ["createdAt", "updatedAt"],
  Purchase: ["createdAt", "updatedAt"],
  Session: ["createdAt", "updatedAt", "expiresAt"],
  Subscription: ["createdAt", "updatedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt"],
  TwoFactor: ["createdAt", "updatedAt", "lockedUntil"],
  Verification: ["createdAt", "updatedAt", "expiresAt"],
}

const RELATIONS: Record<string, Record<string, string>> = {
  User: {
    accounts: "Account",
    projects: "Project",
    purchases: "Purchase",
    sessions: "Session",
    subscription: "Subscription",
    twoFactors: "TwoFactor",
  },
  Account: { user: "User" },
  Plan: { purchases: "Purchase", subscriptions: "Subscription" },
  Project: { user: "User" },
  Purchase: { plan: "Plan", user: "User" },
  Session: { user: "User" },
  Subscription: { plan: "Plan", user: "User" },
  TwoFactor: { user: "User" },
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function decodeRow(model: string, row: any): any {
  if (row == null || typeof row !== "object") return row
  for (const field of DATE_FIELDS[model] ?? []) {
    if (typeof row[field] === "string") row[field] = toDate(row[field])
  }
  for (const [key, rel] of Object.entries(RELATIONS[model] ?? {})) {
    const value = row[key]
    if (Array.isArray(value)) value.forEach((item) => decodeRow(rel, item))
    else if (value && typeof value === "object") decodeRow(rel, value)
  }
  return row
}

function encodeWrite(model: string, data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  const rels = RELATIONS[model] ?? {}
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      out[key] = toTs(value)
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value.create !== undefined || value.connect !== undefined || value.disconnect !== undefined)
    ) {
      // v7 nested write { create: [...] } / { connect: {...} } becomes a v8
      // relation mutator callback.
      const relModel = rels[key]
      out[key] = (mutator: any) => {
        if (value.connect !== undefined) return mutator.connect(value.connect)
        if (value.disconnect !== undefined) return mutator.disconnect(value.disconnect)
        const rows = Array.isArray(value.create) ? value.create : [value.create]
        return mutator.create(rows.map((row: any) => encodeWrite(relModel, row)))
      }
    } else {
      out[key] = value
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Argument translation: v7 `where`/`orderBy`/`select`/`include` objects onto
// the v8 collection chain.

type FieldProxy = Record<string, any>

function fieldPredicate(field: any, value: any): any {
  if (value === null) return field.isNull()
  if (typeof value !== "object" || value instanceof Date) return field.eq(encodeScalar(value))
  const terms: any[] = []
  for (const [op, operand] of Object.entries(value)) {
    switch (op) {
      case "equals":
        terms.push(operand === null ? field.isNull() : field.eq(encodeScalar(operand)))
        break
      case "not":
        terms.push(operand === null ? field.isNotNull() : field.neq(encodeScalar(operand)))
        break
      case "in":
        terms.push(field.in((operand as any[]).map(encodeScalar)))
        break
      case "notIn":
        terms.push(not(field.in((operand as any[]).map(encodeScalar))))
        break
      case "gt":
        terms.push(field.gt(encodeScalar(operand)))
        break
      case "gte":
        terms.push(field.gte(encodeScalar(operand)))
        break
      case "lt":
        terms.push(field.lt(encodeScalar(operand)))
        break
      case "lte":
        terms.push(field.lte(encodeScalar(operand)))
        break
      case "contains": {
        const insensitive = (value as any).mode === "insensitive"
        terms.push(insensitive ? field.ilike(`%${operand}%`) : field.like(`%${operand}%`))
        break
      }
      case "startsWith":
        terms.push(field.like(`${operand}%`))
        break
      case "endsWith":
        terms.push(field.like(`%${operand}`))
        break
      case "mode":
        break
      default:
        throw new Error(`Unsupported where operator "${op}"`)
    }
  }
  return terms.length === 1 ? terms[0] : and(...terms)
}

function encodeScalar(value: any): any {
  return value instanceof Date ? toTs(value) : value
}

function wherePredicate(where: Record<string, any>) {
  return (f: FieldProxy) => {
    const terms: any[] = []
    for (const [key, value] of Object.entries(where)) {
      if (key === "OR") terms.push(or(...(value as any[]).map((w) => wherePredicate(w)(f))))
      else if (key === "AND") terms.push(and(...(value as any[]).map((w) => wherePredicate(w)(f))))
      else if (key === "NOT") terms.push(not(wherePredicate(value as any)(f)))
      else terms.push(fieldPredicate(f[key], value))
    }
    return terms.length === 1 ? terms[0] : and(...terms)
  }
}

function applyOrderBy(collection: any, orderBy: any): any {
  if (!orderBy) return collection
  const items = Array.isArray(orderBy) ? orderBy : [orderBy]
  return collection.orderBy(
    items.map((item) => (f: FieldProxy) => {
      const [key, dir] = Object.entries(item)[0]
      return dir === "desc" ? f[key].desc() : f[key].asc()
    }),
  )
}

function applyRelationArgs(branch: any, args: any): any {
  let b = branch
  if (args.where) b = b.where(wherePredicate(args.where))
  b = applyOrderBy(b, args.orderBy)
  if (args.take !== undefined) b = b.limit(args.take)
  if (args.skip !== undefined) b = b.offset(args.skip)
  if (args.select) b = applySelect(b, args.select)
  if (args.include) b = applyInclude(b, args.include)
  return b
}

function applySelect(collection: any, select: Record<string, any>): any {
  const scalars: string[] = []
  let c = collection
  for (const [key, value] of Object.entries(select)) {
    if (value === true) scalars.push(key)
    else if (value && typeof value === "object") c = c.include(key, (b: any) => applyRelationArgs(b, value))
  }
  if (scalars.length > 0) c = c.select(...scalars)
  return c
}

function applyInclude(collection: any, include: Record<string, any>): any {
  let c = collection
  for (const [key, value] of Object.entries(include)) {
    c = value === true ? c.include(key) : c.include(key, (b: any) => applyRelationArgs(b, value))
  }
  return c
}

function applyArgs(collection: any, args: any): any {
  let c = collection
  if (args?.where) c = c.where(wherePredicate(args.where))
  c = applyOrderBy(c, args?.orderBy)
  if (args?.select) c = applySelect(c, args.select)
  if (args?.include) c = applyInclude(c, args.include)
  if (args?.skip !== undefined) c = c.offset(args.skip)
  if (args?.take !== undefined) c = c.limit(args.take)
  return c
}

// ---------------------------------------------------------------------------
// The facade itself. `any` is used deliberately at this boundary: the real
// types live in `generated/prisma8/contract.d.ts` and new code should use
// `db8`, which is fully typed.

function makeDelegate(model: string): any {
  const root = () => (db8.orm.public as any)[model]
  const filtered = (where: Record<string, any>) =>
    where && Object.keys(where).length > 0 ? root().where(wherePredicate(where)) : root().where({})

  return {
    findUnique: async (args: any) => decodeRow(model, await applyArgs(filtered(args?.where ?? {}), args).first()),
    findUniqueOrThrow: async (args: any) =>
      decodeRow(model, await applyArgs(filtered(args?.where ?? {}), args).firstOrThrow()),
    findFirst: async (args: any) => decodeRow(model, await applyArgs(filtered(args?.where ?? {}), args).first()),
    findFirstOrThrow: async (args: any) =>
      decodeRow(model, await applyArgs(filtered(args?.where ?? {}), args).firstOrThrow()),
    findMany: async (args: any) => (await applyArgs(filtered(args?.where ?? {}), args).all()).map((r: any) => decodeRow(model, r)),
    count: async (args: any) => {
      const result = await filtered(args?.where ?? {}).aggregate((a: any) => ({ n: a.count() }))
      return result.n
    },
    create: async (args: any) => decodeRow(model, await root().create(encodeWrite(model, args.data))),
    createMany: async (args: any) => ({ count: await root().createAndCount(args.data.map((d: any) => encodeWrite(model, d))) }),
    update: async (args: any) => {
      // v7 `update` throws when the row is missing; v8 answers null. Call
      // sites were written against the throw, so keep it.
      const row = await filtered(args.where).update(encodeWrite(model, args.data))
      if (row == null) throw new Error(`${model} record to update not found`)
      return decodeRow(model, row)
    },
    updateMany: async (args: any) => ({
      count: await filtered(args?.where ?? {}).updateAndCount(encodeWrite(model, args.data)),
    }),
    delete: async (args: any) => {
      const row = await filtered(args.where).delete()
      if (row == null) throw new Error(`${model} record to delete not found`)
      return decodeRow(model, row)
    },
    deleteMany: async (args: any) => ({ count: await filtered(args?.where ?? {}).deleteAndCount() }),
    upsert: async (args: any) =>
      // v8 `upsert` is a terminal on the base collection: the conflict
      // target goes in `conflictOn` (a unique-constraint criterion), not in
      // a `.where(...)` — every call site upserts on a unique key, so the
      // v7 `where` maps onto `conflictOn` unchanged.
      decodeRow(
        model,
        await root().upsert({
          create: encodeWrite(model, args.create),
          update: encodeWrite(model, args.update),
          conflictOn: args.where,
        }),
      ),
  }
}

export const prisma = {
  user: makeDelegate("User") as UserDelegate,
  account: makeDelegate("Account") as AccountDelegate,
  session: makeDelegate("Session") as SessionDelegate,
  verification: makeDelegate("Verification") as VerificationDelegate,
  twoFactor: makeDelegate("TwoFactor") as TwoFactorDelegate,
  plan: makeDelegate("Plan") as PlanDelegate,
  project: makeDelegate("Project") as ProjectDelegate,
  subscription: makeDelegate("Subscription") as SubscriptionDelegate,
  purchase: makeDelegate("Purchase") as PurchaseDelegate,
  newsletterSubscriber: makeDelegate("NewsletterSubscriber") as NewsletterSubscriberDelegate,
  $disconnect: () => db8.close(),
}

interface Delegate<Row> {
  // The facade cannot narrow result types per `select`/`include` the way
  // the generated v7 client did. Rows are typed with every scalar plus the
  // relations as optional fields — present exactly when the query asked
  // for them.
  findUnique(args: any): Promise<Row | null>
  findUniqueOrThrow(args: any): Promise<Row>
  findFirst(args?: any): Promise<Row | null>
  findFirstOrThrow(args?: any): Promise<Row>
  findMany(args?: any): Promise<Row[]>
  count(args?: any): Promise<number>
  create(args: any): Promise<Row>
  createMany(args: any): Promise<{ count: number }>
  update(args: any): Promise<Row>
  updateMany(args: any): Promise<{ count: number }>
  delete(args: any): Promise<Row>
  deleteMany(args?: any): Promise<{ count: number }>
  upsert(args: any): Promise<Row>
}

type UserDelegate = Delegate<User>
type AccountDelegate = Delegate<Account>
type SessionDelegate = Delegate<Session>
type VerificationDelegate = Delegate<Verification>
type TwoFactorDelegate = Delegate<TwoFactor>
type PlanDelegate = Delegate<Plan>
type ProjectDelegate = Delegate<Project>
type SubscriptionDelegate = Delegate<Subscription>
type PurchaseDelegate = Delegate<Purchase>
type NewsletterSubscriberDelegate = Delegate<NewsletterSubscriber>

/** Structural stand-in for the old `PrismaClient` type in seed signatures. */
export type PrismaClient = typeof prisma
export type { Models }

/* eslint-enable @typescript-eslint/no-explicit-any */
