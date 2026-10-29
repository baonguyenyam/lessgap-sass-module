import { defineVertical } from "./types"

export const dental = defineVertical({
  key: "dental",
  label: "Dental practice",
  defaultTheme: "main",
  suggestedThemes: ["main"],
  modules: { catalog: true, team: true, newsletter: true },
  terminology: { service: "treatment", staff: "dentist", appointment: "visit" },
  sampleData: {
    serviceCategories: ["Checkups", "Hygiene", "Treatments"],
    services: [
      { name: "New patient exam", durationMinutes: 45, priceCents: 12000, category: "Checkups" },
      { name: "Scale and polish", durationMinutes: 30, priceCents: 9000, category: "Hygiene" },
      { name: "Filling", durationMinutes: 60, priceCents: 18000, category: "Treatments" },
    ],
    staff: ["Dr. Nguyen", "Dr. Patel"],
  },
})
