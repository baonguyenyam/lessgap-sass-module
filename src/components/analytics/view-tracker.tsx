"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** The view beacon (task 8.7): one POST per mounted page — `/api/view`
 * upserts the tenant's path+day counter. */
export function ViewTracker() {
  const path = usePathname()
  useEffect(() => {
    void fetch("/api/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {})
  }, [path])
  return null
}
