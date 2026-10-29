import type { SiteData } from "@/themes/types"

/** Fixture SiteData — every theme ships one for review without a tenant. */
export const fixtureSite: SiteData = {
  tenant: { name: "Fixture Co", slug: "fixture" },
  site: { themeKey: "classic", tokens: {}, sections: {}, status: "PUBLISHED" },
  team: [
    { id: "m1", name: "Mia", photo: null, bio: "Senior stylist" },
    { id: "m2", name: "Linh", photo: null, bio: null },
  ],
  catalog: {
    categories: [{ id: "c1", name: "Nails", sortOrder: 0 }],
    services: [
      {
        id: "s1",
        name: "Manicure",
        description: "Classic",
        durationMinutes: 45,
        priceCents: 2800,
        currency: "usd",
        categoryId: "c1",
        imageKey: null,
      },
    ],
  },
  settings: {
    profile: {
      name: "Fixture Co",
      tagline: "A fixture business",
      phone: "+1 555 0100",
      email: "hi@fixture.co",
      address: "1 Main St",
    },
    hours: { mon: "09:00-17:00", tue: "09:00-17:00", wed: "09:00-17:00", thu: "09:00-17:00", fri: "09:00-17:00" },
    appearance: { accentColor: "#7c3aed" },
  },
}
