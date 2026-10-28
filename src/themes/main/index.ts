import type { Theme } from "@/themes/types"
import { themeManifest, tokenSchema } from "./theme"
import { defaultTokens } from "./tokens"
import layout from "./layout"
import home from "./pages/home"
import hero from "./sections/hero"
import hours from "./sections/hours"

export const mainTheme: Theme = {
  ...themeManifest,
  tokenSchema,
  layout,
  pages: { home },
  sections: { hero, hours },
}
export { defaultTokens }
