import { beforeEach, describe, expect, it } from "vitest"

import { useDrawer } from "@/stores/drawer"

beforeEach(() => useDrawer.getState().close())

describe("useDrawer", () => {
  it("opens one drawer for one record, and closes it", () => {
    useDrawer.getState().open("user", "u1")
    expect(useDrawer.getState()).toMatchObject({ kind: "user", id: "u1" })
    useDrawer.getState().close()
    expect(useDrawer.getState()).toMatchObject({ kind: null, id: null })
  })

  it("opens a create drawer with no record", () => {
    useDrawer.getState().open("project")
    expect(useDrawer.getState()).toMatchObject({ kind: "project", id: null })
  })
})
