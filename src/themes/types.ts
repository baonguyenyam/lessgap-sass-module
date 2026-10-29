import type { ComponentType } from "react"
import type { z } from "zod"

/**
 * A theme (spec/06): a folder exporting a manifest and React Server
 * Components. It renders the `SiteData` the site route gives it — never the
 * database, the session or a service.
 */
export type SiteData = {
  tenant: { name: string; slug: string }
  site: { themeKey: string; tokens: unknown; sections: unknown; status: string }
  settings: {
    profile: { name?: string; tagline?: string; phone?: string; email?: string; address?: string }
    hours: Record<string, string>
    appearance: { accentColor?: string }
  }
  /** Present when the `catalog` module is enabled (task 4.2) — the site's
   * service list, grouped by category. */
  /** Present when the `team` module is enabled (task 4.3) — the site's
   * staff list. */
  team?: { id: string; name: string; photo: string | null; bio: string | null }[]
  chatbotEnabled?: boolean
  catalog?: {
    categories: { id: string; name: string; sortOrder: number }[]
    services: {
      id: string
      name: string
      description: string | null
      durationMinutes: number
      priceCents: number
      currency: string
      categoryId: string | null
      imageKey: string | null
    }[]
  }
}

export type ThemeManifest = {
  key: string
  name: string
  kind: "shared" | "custom"
  verticals: string[]
  tokenSchema: z.ZodType
  extends?: string
}

export type Theme = ThemeManifest & {
  layout: ComponentType<{ children: React.ReactNode; data: SiteData }>
  pages: Record<string, ComponentType<{ data: SiteData }>>
  sections: Record<string, ComponentType<{ data: SiteData; config?: Record<string, unknown> }>>
}
