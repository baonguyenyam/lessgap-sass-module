import { z } from "zod"
import type { ThemeManifest } from "@/themes/types"

/** The one shared theme every tenant starts on (task 3.5, spec/06). */
export const tokenSchema = z.object({
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .default("#0ea5e9"),
  fontFamily: z.enum(["system", "serif", "mono"]).default("system"),
})

export const themeManifest: ThemeManifest = {
  key: "main",
  name: "Main",
  kind: "shared",
  verticals: ["generic"],
  tokenSchema,
}
