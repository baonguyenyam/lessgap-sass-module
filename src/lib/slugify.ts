/**
 * A tenant slug from a display name ("Ngân's Nails" → "ngan-s-nails").
 * Diacritics fold to ASCII; an empty result becomes "workspace".
 */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace"
