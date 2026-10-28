import { log } from "@/platform/log"
import type { Theme } from "@/themes/types"
import { mainTheme } from "@/themes/main"

/**
 * The theme registry (spec/06): every theme by key. An unknown `themeKey`
 * falls back to `main` and logs — a bad key must never take the site down.
 */
export const themes = { main: mainTheme } as const

export function resolveTheme(themeKey: string): Theme {
  const theme = (themes as Record<string, Theme>)[themeKey]
  if (!theme) {
    log.error("theme.unknown_key", { themeKey })
    return mainTheme
  }
  return theme
}
