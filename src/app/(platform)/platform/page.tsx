import { redirect } from "next/navigation"

export const instant = false

/** The console's landing page is the tenant list (task 1.10). */
export default function PlatformPage() {
  redirect("/platform/tenants")
}
