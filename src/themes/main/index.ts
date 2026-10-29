import type { Theme } from "@/themes/types"
import { themeManifest, tokenSchema } from "./theme"
import { defaultTokens } from "./tokens"
import layout from "./layout"
import home from "./pages/home"
import hero from "./sections/hero"
import hours from "./sections/hours"
import services from "./sections/services"
import team from "./sections/team"

export const mainTheme: Theme = {
  ...themeManifest,
  tokenSchema,
  layout,
  pages: { home },
  sections: { hero, hours, services, team },
}
export { defaultTokens }
