import { tenantPath } from "@/lib/tenant-paths"

/**
 * Two sections, each with its own vertical tabs. Account is the person: the
 * profile, how they sign in, their data and its history. Settings is how the
 * app behaves for them. The layouts, the breadcrumbs and every action that
 * redirects back to one of these pages read their URLs from here.
 */
export const ACCOUNT_BASE = "/dashboard/account"

/**
 * In menu order, each under its group heading (the section menu draws one
 * heading per group, platform.madelab.io's profile layout).
 */
export const ACCOUNT_PAGES = [
  { key: "profile", href: ACCOUNT_BASE, group: "account" },
  { key: "preferences", href: `${ACCOUNT_BASE}/preferences`, group: "account" },
  { key: "notifications", href: `${ACCOUNT_BASE}/notifications`, group: "account" },
  { key: "security", href: `${ACCOUNT_BASE}/security`, group: "security" },
  { key: "activity", href: `${ACCOUNT_BASE}/activity`, group: "security" },
  { key: "backup", href: `${ACCOUNT_BASE}/backup`, group: "data" },
] as const

export type AccountPageKey = (typeof ACCOUNT_PAGES)[number]["key"]

export type AccountHref = (typeof ACCOUNT_PAGES)[number]["href"]

export function accountHref(key: AccountPageKey): AccountHref {
  return ACCOUNT_PAGES.find((page) => page.key === key)!.href
}

const SETTINGS_PAGES = [
  { key: "general", group: "workspace" },
  { key: "site", group: "workspace", permission: "settings.manage" },
  { key: "domains", group: "workspace", permission: "settings.manage" },
  { key: "modules", group: "features", permission: "settings.manage" },
  { key: "payments", group: "features", permission: "settings.manage", module: "payments" },
  { key: "localization", group: "preferences" },
  { key: "display", group: "preferences" },
] as const

/**
 * The tenant's settings pages, under its dashboard (task 1.7), in menu order
 * and grouped. `segment` is the part after `settings/`; `permission` and
 * `module` repeat what each page checks, so the menu offers only pages that
 * open for the viewer.
 */
export function settingsPages(slug: string) {
  return SETTINGS_PAGES.map((page) => {
    const segment = page.key === "general" ? null : page.key
    return {
      ...page,
      segment,
      href: tenantPath(slug, segment ? `settings/${segment}` : "settings"),
    } as {
      key: (typeof page)["key"]
      group: string
      segment: string | null
      href: ReturnType<typeof tenantPath>
      permission?: string
      module?: string
    }
  })
}

/**
 * Result codes the account actions put in the query string (`?ok=` or
 * `?error=`), and whether each reads as an error. The copy is in the message
 * file under `dashboard.settings.messages`.
 */
const MESSAGE_IS_ERROR: Record<string, boolean> = {
  unlinked: false,
  password: false,
  "2fa-enabled": false,
  "2fa-disabled": false,
  "2fa-password": true,
  "email-sent": false,
  "email-invalid": true,
  "email-same": true,
  "email-change": true,
  rate: true,
  "session-revoked": false,
  "sessions-revoked": false,
  session: true,
  // Not an error: a sign-in that spent a backup code and says so.
  "backup-used": false,
  "last-method": true,
  demo: true,
  confirm: true,
  subscription: true,
  "last-admin": true,
  "last-root": true,
  unlink: true,
  policy: true,
  current: true,
}

export const SETTINGS_MESSAGE_CODES = Object.keys(MESSAGE_IS_ERROR)

/** The message to show for a result code, or null for none or an unknown one. */
export function settingsMessage(code: string | undefined): { code: string; error: boolean } | null {
  if (!code || !Object.hasOwn(MESSAGE_IS_ERROR, code)) return null
  return { code, error: MESSAGE_IS_ERROR[code] }
}
