/**
 * Cache tags for the settings (spec/adr/0022). Every tag for tenant or person
 * data carries that tenant's or person's id, so a save expires only its own
 * entries and nothing tenant-specific is ever cached under a shared key
 * (.agents/rules/multi-tenancy.md).
 */
export const PLATFORM_SETTINGS_TAG = "platform-settings"

export const tenantSettingsTag = (tenantId: string) => `tenant-settings:${tenantId}`

export const userSettingsTag = (userId: string) => `user-settings:${userId}`
