import type { ReactNode } from "react"

/**
 * Outer shell of the navbar.
 *
 * The stickiness lives on the layout wrapper (banner and navbar pin together
 * in demo mode) rather than here.
 */
export function NavbarWrapper({ children }: { children: ReactNode }) {
  return <header className="w-full px-4 pt-4">{children}</header>
}
