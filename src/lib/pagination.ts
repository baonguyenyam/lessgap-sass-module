export type PageItem = number | "gap"

/**
 * The page buttons of a pager: the first and last page always, the current
 * one with `siblings` on each side, and a gap where pages are skipped
 * ("1 … 4 5 6 … 10"). A gap never stands for a single page: that page is
 * shown instead, so the row keeps the same length.
 */
export function pageItems(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 0) return []
  const page = Math.min(Math.max(current, 1), total)
  // first + last + current + siblings + two gaps
  const slots = siblings * 2 + 5
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1)

  const start = Math.max(page - siblings, 2)
  const end = Math.min(page + siblings, total - 1)
  const showLeftGap = start > 3
  const showRightGap = end < total - 2

  if (!showLeftGap) {
    const count = siblings * 2 + 3
    return [...Array.from({ length: count }, (_, i) => i + 1), "gap", total]
  }
  if (!showRightGap) {
    const count = siblings * 2 + 3
    return [1, "gap", ...Array.from({ length: count }, (_, i) => total - count + i + 1)]
  }
  return [1, "gap", ...Array.from({ length: end - start + 1 }, (_, i) => start + i), "gap", total]
}
