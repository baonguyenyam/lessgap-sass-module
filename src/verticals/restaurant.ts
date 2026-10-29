import { defineVertical } from "./types"

export const restaurant = defineVertical({
  key: "restaurant",
  label: "Restaurant",
  defaultTheme: "main",
  suggestedThemes: ["main"],
  modules: { catalog: true, team: false, newsletter: true },
  terminology: { service: "dish", staff: "staff", appointment: "reservation" },
  sampleData: {
    serviceCategories: ["Starters", "Mains", "Desserts"],
    services: [
      { name: "Spring rolls", durationMinutes: 0, priceCents: 800, category: "Starters" },
      { name: "Pho bo", durationMinutes: 0, priceCents: 1400, category: "Mains" },
      { name: "Che ba mau", durationMinutes: 0, priceCents: 600, category: "Desserts" },
    ],
    staff: [],
  },
})
