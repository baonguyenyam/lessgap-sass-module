import { TenantSettingsTab } from "@/components/settings/tenant-settings-tab"

/** Settings → Localization: language, time zone and date format for the whole tenant. */
export default function LocalizationSettingsPage() {
  return <TenantSettingsTab tab="localization" />
}
