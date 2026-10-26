import { siteConfig } from "@/config/site"

/**
 * Repo-relative Markdown links to URLs that work in the rendered site.
 *
 * The Markdown files are the single source of truth and are read in two
 * places: on GitHub, where `./docs/blog.md` is correct, and here, where the
 * same string would ask the browser for a page that does not exist. So the
 * links stay written for the repository, and the renderer translates each
 * one to the file on GitHub. When no repository URL is configured the href
 * stays untouched, which is better than inventing a link that goes nowhere.
 *
 * `baseDir` is where the file being rendered lives in the repository, because
 * the same href means different things depending on it: `./README.md` from a
 * subdirectory is not the project README.
 */
export function mapRepoHref(href: string, baseDir = ""): string {
  if (!href || /^(https?:|mailto:|tel:|#|\/)/.test(href)) return href

  const hashAt = href.indexOf("#")
  const hash = hashAt === -1 ? "" : href.slice(hashAt)
  const rawPath = hashAt === -1 ? href : href.slice(0, hashAt)
  if (!rawPath) return href

  const repoPath = resolveRepoPath(baseDir, rawPath)
  if (!repoPath) return href

  const repo = siteConfig.links.github
  return repo ? `${repo}/blob/main/${repoPath}${hash}` : href
}

/**
 * Repo-relative image and video paths to URLs the rendered site can load.
 *
 * Media written as `![A clone starting up](../public/media/quick-setup.webp)`
 * is a repository path: GitHub shows it from that path, and Next.js serves
 * everything in public/ from the site root in every deployment, clones
 * included, so here the same string becomes `/media/quick-setup.webp`.
 *
 * A file elsewhere in the repository is not served by the site: it loads from
 * GitHub when a repository URL is configured, and stays as written otherwise.
 */
export function mapRepoMedia(src: string, baseDir = ""): string {
  if (!src || /^(https?:|data:|\/)/.test(src)) return src

  const repoPath = resolveRepoPath(baseDir, src)
  if (!repoPath) return src
  if (repoPath.startsWith("public/")) return `/${repoPath.slice("public/".length)}`

  const repo = siteConfig.links.github
  return repo ? `${repo}/raw/main/${repoPath}` : src
}

/**
 * Whether a media path is a video. The site plays these muted and looping;
 * GitHub shows a video written as a Markdown image as a broken one, so a clip
 * that must also move on GitHub is better shipped as an animated WebP.
 */
export function isVideoPath(src: string): boolean {
  return /\.(?:mp4|webm)$/i.test(src.split(/[?#]/)[0])
}

/** Collapses `.` and `..` into a repository path, or null if it escapes the root. */
function resolveRepoPath(baseDir: string, relative: string): string | null {
  const segments: string[] = []
  for (const part of `${baseDir}/${relative}`.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(part)
  }
  return segments.join("/") || null
}
