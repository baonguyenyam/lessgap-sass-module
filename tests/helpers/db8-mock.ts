import { vi, type Mock } from "vitest"

/**
 * A stand-in for `@/lib/db8` in unit tests:
 *
 *   vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
 *   const db = (await import("@/lib/db8")) as unknown as Db8Mock
 *
 * `db8.orm.public.<Model>` is a collection whose chain methods (where, select,
 * include, orderBy, limit, offset) record their arguments, and whose terminals
 * (first, all, create, update, …) call one `vi.fn` per model and terminal:
 * `db.fn("User.first").mockResolvedValue(row)`. `db.calls` lists every terminal
 * call with the chain that led to it, so a test can assert the filter a write
 * used: `db.call("User.updateAndCount")?.chain`.
 */
const CHAIN = ["where", "select", "include", "orderBy", "limit", "offset"] as const
const TERMINALS = [
  "first",
  "firstOrThrow",
  "all",
  "create",
  "createAndCount",
  "update",
  "updateAndCount",
  "upsert",
  "delete",
  "deleteAndCount",
  "aggregate",
] as const

export type Db8Call = { key: string; chain: Array<[string, unknown[]]>; args: unknown[] }

export function createDb8Mock() {
  const fns = new Map<string, Mock>()
  const calls: Db8Call[] = []

  const fn = (key: string): Mock => {
    if (!fns.has(key)) fns.set(key, vi.fn())
    return fns.get(key)!
  }

  const collection = (model: string, chain: Array<[string, unknown[]]>): Record<string, unknown> => {
    const c: Record<string, unknown> = {}
    for (const method of CHAIN) c[method] = (...args: unknown[]) => collection(model, [...chain, [method, args]])
    for (const terminal of TERMINALS) {
      c[terminal] = (...args: unknown[]) => {
        const key = `${model}.${terminal}`
        calls.push({ key, chain, args })
        return fn(key)(...args)
      }
    }
    return c
  }

  const db8 = {
    orm: { public: new Proxy({}, { get: (_target, model) => collection(String(model), []) }) },
    close: vi.fn(),
  }

  return {
    db8,
    uniqueIndexKey: <K>(key: K) => key,
    fn,
    calls,
    /** The last terminal call with this key, e.g. "User.updateAndCount". */
    call: (key: string) => calls.findLast((c) => c.key === key),
    reset() {
      fns.forEach((f) => f.mockReset())
      calls.length = 0
    },
  }
}

export type Db8Mock = ReturnType<typeof createDb8Mock>
