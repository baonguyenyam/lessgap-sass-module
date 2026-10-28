"use client"

import { RouteError } from "@/components/layout/route-error"

// Inside the app shell: the sidebar and header stay, only the page is replaced.
export default function PageError(props: { error: unknown; retry: () => void }) {
  return <RouteError {...props} />
}
