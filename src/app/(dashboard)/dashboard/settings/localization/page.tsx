import { TenantSettingsTab } from "@/components/settings/tenant-settings-tab"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Settings → Localization: language, time zone and date format for the whole tenant. */
export default function LocalizationSettingsPage() {
  return <TenantSettingsTab tab="localization" />
}
