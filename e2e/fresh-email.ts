import { newId } from "@/lib/ids"

/**
 * A new address for every account a spec creates, so runs never collide.
 *
 * Always starts with `e2e-`: global-teardown.ts deletes exactly those users,
 * and nothing else, after the suite.
 */
export function freshEmail(scope?: string): string {
  return `e2e-${scope ? `${scope}-` : ""}${newId()}@example.com`
}
