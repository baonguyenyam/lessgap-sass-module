import { defineVertical } from "./types"

export const nailSalon = defineVertical({
  key: "nail_salon",
  label: "Nail salon",
  defaultTheme: "main",
  suggestedThemes: ["main"],
  modules: { catalog: true, team: true, newsletter: true },
  terminology: { service: "service", staff: "technician", appointment: "appointment" },
  sampleData: {
    serviceCategories: ["Manicure", "Pedicure", "Nail art", "Waxing"],
    services: [
      { name: "Classic manicure", durationMinutes: 30, priceCents: 2500, category: "Manicure" },
      { name: "Gel manicure", durationMinutes: 45, priceCents: 3500, category: "Manicure" },
      { name: "Spa pedicure", durationMinutes: 60, priceCents: 4500, category: "Pedicure" },
      { name: "Full set acrylics", durationMinutes: 90, priceCents: 6500, category: "Nail art" },
    ],
    staff: ["Mia", "Linh"],
  },
})
