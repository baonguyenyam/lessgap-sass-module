import { create } from "zustand"

/**
 * Which edit drawer is open, and for which record (spec/adr/0020-application-stack.md: Zustand for
 * UI state shared between components).
 *
 * A table's columns are defined once, outside any component, so the "Edit"
 * item in a row cannot reach the state of the component that renders the
 * drawer. Both read this store instead: the row calls `open`, the drawer
 * renders when `kind` is its own.
 */
type DrawerState = {
  kind: string | null
  id: string | null
  open: (kind: string, id?: string | null) => void
  close: () => void
}

export const useDrawer = create<DrawerState>((set) => ({
  kind: null,
  id: null,
  open: (kind, id = null) => set({ kind, id }),
  close: () => set({ kind: null, id: null }),
}))
