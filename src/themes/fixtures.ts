import { fixtureSite as classicFixture } from "./classic/theme.fixtures"
import { fixtureSite as mainFixture } from "./main/theme.fixtures"
import type { SiteData } from "./types"

/** The fixture every theme ships (spec/11 D8): a full SiteData each shared
 * theme renders for review — no tenant, no database. */
export const themeFixtures: Record<string, SiteData> = {
  classic: classicFixture,
  main: mainFixture,
}
