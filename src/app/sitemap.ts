import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"
import { isKitSite } from "@/config/kit"

/**
 * Sitemap built from the real public routes. Served at /sitemap.xml.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // A demo deployment is `noindex` (see the root layout): handing search
  // engines a list of URLs we ask them to ignore only creates noise.
  if (process.env.DEMO_MODE === "true") return []

  return [
    { url: `${siteConfig.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/changelog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteConfig.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    // The kit's own site sells nothing and has no accounts, so it ships no
    // terms and no separate cookie page: the footer hides both links and the
    // cookie disclosure is a section of the privacy policy. Listing them here
    // would submit the placeholder pages for indexing. Your app keeps them.
    ...(isKitSite
      ? []
      : [
          { url: `${siteConfig.url}/terms`, changeFrequency: "yearly" as const, priority: 0.2 },
          { url: `${siteConfig.url}/cookies`, changeFrequency: "yearly" as const, priority: 0.2 },
        ]),
  ]
}
