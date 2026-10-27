import { describe, expect, it } from "vitest"

import {
  backupKey,
  backupTakenAt,
  copyHeader,
  copyRow,
  copyValue,
  dumpFooter,
  dumpHeader,
  loadOrder,
} from "@/platform/database/sql-dump"

const t = (name: string) => ({ schema: "public", name })

describe("copyValue", () => {
  it("writes null as \\N and escapes what COPY's text format escapes", () => {
    expect(copyValue(null)).toBe("\\N")
    expect(copyValue("a\tb\nc\rd\\e")).toBe("a\\tb\\nc\\rd\\\\e")
    expect(copyValue('plain {"json":1}')).toBe('plain {"json":1}')
  })

  it("keeps the literal text \\N distinct from null", () => {
    expect(copyValue("\\N")).toBe("\\\\N")
  })

  it("joins a row with tabs", () => {
    expect(copyRow(["1", null, "x y"])).toBe("1\t\\N\tx y")
  })
})

describe("copyHeader", () => {
  it("quotes the table and every column", () => {
    expect(copyHeader(t("User"), ["id", "createdAt"])).toBe('COPY "public"."User" ("id", "createdAt") FROM stdin;')
  })
})

describe("loadOrder", () => {
  it("puts every table after the tables it points to", () => {
    const order = loadOrder(
      [t("Session"), t("User"), t("Member"), t("organization")],
      [
        { from: t("Session"), to: t("User") },
        { from: t("Member"), to: t("User") },
        { from: t("Member"), to: t("organization") },
      ]
    ).map((x) => x.name)
    expect(order.indexOf("User")).toBeLessThan(order.indexOf("Session"))
    expect(order.indexOf("User")).toBeLessThan(order.indexOf("Member"))
    expect(order.indexOf("organization")).toBeLessThan(order.indexOf("Member"))
  })

  it("ignores self references and keeps a cycle instead of dropping it", () => {
    const order = loadOrder(
      [t("A"), t("B"), t("Tree")],
      [
        { from: t("Tree"), to: t("Tree") },
        { from: t("A"), to: t("B") },
        { from: t("B"), to: t("A") },
      ]
    ).map((x) => x.name)
    expect(order).toHaveLength(3)
    expect(order[0]).toBe("Tree")
  })
})

describe("backup keys", () => {
  it("names a backup by its UTC time and reads the time back", () => {
    const at = new Date("2026-10-27T19:50:07.123Z")
    const key = backupKey(at)
    expect(key).toBe("platform-backups/2026-10-27T19-50-07Z.sql.gz")
    expect(backupTakenAt(key)?.toISOString()).toBe("2026-10-27T19:50:07.000Z")
  })

  it("does not claim keys it did not write", () => {
    expect(backupTakenAt("platform-backups/notes.txt")).toBeNull()
  })
})

describe("header and footer", () => {
  it("records the contract hash and wraps the data in one transaction", () => {
    const header = dumpHeader({ takenAt: new Date("2026-10-27T00:00:00Z"), appVersion: "2.20.0", contractHash: "abc" })
    expect(header).toContain("Contract hash: abc")
    expect(header).toContain("BEGIN;")
    expect(dumpFooter([])).toContain("COMMIT;")
  })

  it("restores sequence positions, skipping sequences never used", () => {
    const footer = dumpFooter([
      { name: t("Thing_id_seq"), lastValue: "42" },
      { name: t("Unused_seq"), lastValue: null },
    ])
    expect(footer).toContain(`SELECT pg_catalog.setval('"public"."Thing_id_seq"', 42, true);`)
    expect(footer).not.toContain("Unused_seq")
  })
})
