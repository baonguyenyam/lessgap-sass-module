import { defineVertical } from "./types"

export const generic = defineVertical({
  key: "generic",
  label: "Business",
  defaultTheme: "main",
  suggestedThemes: ["main"],
  modules: { catalog: true, team: true, newsletter: false },
  terminology: { service: "service", staff: "staff", appointment: "appointment" },
  sampleData: {
    serviceCategories: ["Services"],
    services: [{ name: "Consultation", durationMinutes: 30, priceCents: 5000, category: "Services" }],
    staff: [],
  },
})
