import type { SiteData } from "@/themes/types"

/** Fixture SiteData — every theme ships one for review without a tenant. */
export const fixtureSite: SiteData = {
  tenant: { name: "Fixture Co", slug: "fixture" },
  site: { themeKey: "main", tokens: {}, sections: {}, status: "PUBLISHED" },
  settings: {
    profile: {
      name: "Fixture Co",
      tagline: "A fixture business",
      phone: "+1 555 0100",
      email: "hi@fixture.co",
      address: "1 Main St",
    },
    hours: { mon: "09:00-17:00", tue: "09:00-17:00", wed: "09:00-17:00", thu: "09:00-17:00", fri: "09:00-17:00" },
    appearance: { accentColor: "#0ea5e9" },
  },
}
