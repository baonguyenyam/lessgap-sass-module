import { log } from "@/platform/log"
import type { Vertical } from "./types"
import { nailSalon } from "./nail-salon"
import { barber } from "./barber"
import { restaurant } from "./restaurant"
import { dental } from "./dental"
import { generic } from "./generic"

const verticals: Record<string, Vertical> = {
  nail_salon: nailSalon,
  barber,
  restaurant,
  dental,
  generic,
}

/** The vertical's preset (spec/06): an unknown key falls back to `generic`
 * and logs — never 500s the wizard. */
export function getVertical(key: string | null | undefined): Vertical {
  const found = key ? verticals[key] : undefined
  if (!found) {
    log.error(`vertical: unknown key "${key ?? "null"}", falling back to generic`)
    return generic
  }
  return found
}

export const verticalKeys = Object.keys(verticals)
export type { Vertical } from "./types"
