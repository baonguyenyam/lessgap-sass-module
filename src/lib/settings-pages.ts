/**
 * Two sections, each with its own vertical tabs. Account is the person: the
 * profile, how they sign in, their data and its history. Settings is how the
 * app behaves for them. The layouts, the breadcrumbs and every action that
 * redirects back to one of these pages read their URLs from here.
 */
export const ACCOUNT_BASE = "/dashboard/account"

export const ACCOUNT_PAGES = [
  { key: "profile", href: ACCOUNT_BASE },
  { key: "security", href: `${ACCOUNT_BASE}/security` },
  { key: "backup", href: `${ACCOUNT_BASE}/backup` },
  { key: "activity", href: `${ACCOUNT_BASE}/activity` },
] as const

export type AccountPageKey = (typeof ACCOUNT_PAGES)[number]["key"]

export function accountHref(key: AccountPageKey): string {
  return ACCOUNT_PAGES.find((page) => page.key === key)!.href
}

export const SETTINGS_BASE = "/dashboard/settings"

export const SETTINGS_PAGES = [{ key: "preferences", href: SETTINGS_BASE }] as const

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
