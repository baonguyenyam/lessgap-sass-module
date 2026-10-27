import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const session = vi.fn()

vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { deleteProjects, saveProject } = await import("@/app/actions/projects")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  session.mockResolvedValue({ user: { id: "u1", role: "USER" } })
})

describe("saveProject", () => {
  it("refuses a caller who is not signed in", async () => {
    session.mockResolvedValue(null)
    await expect(saveProject(null, { name: "Site" })).resolves.toEqual({ error: "unauthorized" })
  })

  it("parses the form again on the server", async () => {
    await expect(saveProject(null, { name: "" })).resolves.toEqual({ error: "nameRequired" })
    expect(db.calls).toEqual([])
  })

  it("creates a project owned by the caller", async () => {
    await expect(saveProject(null, { name: "Site", description: "" })).resolves.toEqual({})
    expect(db.call("Project.create")?.args).toEqual([{ name: "Site", description: null, userId: "u1" }])
  })

  // Ownership is in the filter: another user's id matches nothing.
  it("edits only a project the caller owns", async () => {
    db.fn("Project.update").mockResolvedValue(null)
    await expect(saveProject("p9", { name: "Site" })).resolves.toEqual({ error: "projectNotFound" })
    expect(db.call("Project.update")?.chain).toEqual([["where", [{ id: "p9", userId: "u1" }]]])
  })
})

describe("deleteProjects", () => {
  it("deletes within the caller's own projects", async () => {
    db.fn("Project.deleteAndCount").mockResolvedValue(2)
    await expect(deleteProjects(["p1", "p2", "p1"])).resolves.toEqual({ deleted: 2 })
    expect(db.call("Project.deleteAndCount")?.chain[0]).toEqual(["where", [{ userId: "u1" }]])
  })

  it("is a no-op for an empty selection", async () => {
    await expect(deleteProjects([])).resolves.toEqual({ deleted: 0 })
    expect(db.calls).toEqual([])
  })
})
