import { siteConfig } from "@/config/site"
import { isKitSite } from "@/config/kit"

/**
 * llms.txt: a Markdown map of the site for large language models, following
 * the llmstxt.org convention (H1, a one-line summary, then curated link
 * lists). Built from the same siteConfig as the sitemap, so the two never
 * drift and it works on any deployment domain. Served at /llms.txt.
 */
export function GET(): Response {
  const base = siteConfig.url
  const repo = siteConfig.links.github

  // The positioning line first, when there is one: an assistant reading this
  // file summarises from the top, and a sentence written for that purpose beats
  // one assembled out of a tagline.
  const summary = siteConfig.llmsSummary
    ? `
${siteConfig.llmsSummary}
`
    : ""

  const body = `# ${siteConfig.name}

> ${siteConfig.description} ${siteConfig.tagline}.
${summary}
${
  isKitSite
    ? `${siteConfig.name} is an open-source, production-ready SaaS app. It ships with authentication, Stripe billing, a Postgres database via Prisma, transactional email and a full dashboard, so you can launch a real product without wiring the plumbing yourself.`
    : `${siteConfig.name} is a SaaS product. Visitors can read about it here, sign up for an account, choose a plan and manage their subscription. Replace this paragraph with a short description of what you do and who you do it for.`
}

## Product
- [Home](${base}/): What ${siteConfig.name} is and who it is for.
- [Pricing](${base}/pricing): Plans and what each tier includes.
- [Changelog](${base}/changelog): Notable changes across releases (current version ${siteConfig.version}).
- [About](${base}/about): What ${siteConfig.name} is for and the thinking behind it.
- [Contact](${base}/contact): How to reach the team.${repo ? `\n- [Source code](${repo}): The public source repository.` : ""}

## Optional
- [Privacy policy](${base}/privacy): How user data is handled.
- [Terms of service](${base}/terms): Terms that govern use of the site.
- [Cookie policy](${base}/cookies): Cookies used by the site.
`

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  })
}
