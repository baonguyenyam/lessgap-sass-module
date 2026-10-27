import { SettingsTab } from "@/components/admin/settings-tab"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

export default function DisplaySettingsPage() {
  return <SettingsTab tab="display" />
}
