import { z } from "zod"
import type { ThemeManifest } from "@/themes/types"

/** The second shared theme (task 4.6, spec/06): a more formal look — serif
 * headings, centered layout — for restaurant and generic verticals. */
export const tokenSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .default("#7c3aed"),
  fontFamily: z.enum(["system", "serif", "mono"]).default("serif"),
})

export const themeManifest: ThemeManifest = {
  key: "classic",
  name: "Classic",
  kind: "shared",
  verticals: ["generic", "restaurant"],
  tokenSchema,
}
