/** A vertical (spec/06): a preset applied once at onboarding — terminology,
 * suggested modules, a default theme, and sample data marked `isSample`.
 * After applying, the tenant's own rows are the truth; only `terminology`
 * persists (copied into the tenant's settings). */
export type Vertical = {
  key: string
  label: string
  defaultTheme: string
  suggestedThemes: string[]
  modules: { catalog: boolean; team: boolean; newsletter: boolean }
  terminology: { service: string; staff: string; appointment: string }
  sampleData: {
    serviceCategories: string[]
    services: { name: string; durationMinutes: number; priceCents: number; category?: string }[]
    staff: string[]
  }
}

export function defineVertical(v: Vertical): Vertical {
  return v
}
