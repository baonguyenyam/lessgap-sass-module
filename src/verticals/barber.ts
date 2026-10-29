import { defineVertical } from "./types"

export const barber = defineVertical({
  key: "barber",
  label: "Barber",
  defaultTheme: "main",
  suggestedThemes: ["main"],
  modules: { catalog: true, team: true, newsletter: false },
  terminology: { service: "cut", staff: "barber", appointment: "appointment" },
  sampleData: {
    serviceCategories: ["Cuts", "Beard", "Extras"],
    services: [
      { name: "Classic cut", durationMinutes: 30, priceCents: 3000, category: "Cuts" },
      { name: "Skin fade", durationMinutes: 45, priceCents: 4000, category: "Cuts" },
      { name: "Beard trim", durationMinutes: 15, priceCents: 1500, category: "Beard" },
    ],
    staff: ["Tony", "Marco"],
  },
})
