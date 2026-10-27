"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

/**
 * TanStack Query, for data fetched or changed in the browser (spec/adr/0020-application-stack.md):
 * a drawer loading a record, a mutation that refreshes the list after it.
 * Pages still read on the server.
 *
 * One client per browser session, created in state so a re-render never
 * drops the cache.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Data a page just rendered on the server is fresh for half a minute.
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
