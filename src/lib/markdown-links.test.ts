import { describe, it, expect } from "vitest"

// siteConfig reads the environment when it is first imported, so it has to be
// in place before the module under test pulls it in.
process.env.NEXT_PUBLIC_GITHUB_URL = "https://github.com/acme/kit"
const { mapRepoHref, mapRepoMedia, isVideoPath } = await import("./markdown-links")

const BLOB = "https://github.com/acme/kit/blob/main"

describe("mapRepoHref", () => {
  it("leaves alone what is already a usable link", () => {
    for (const href of [
      "https://example.com/page",
      "http://example.com",
      "mailto:hello@example.com",
      "#section",
      "/pricing",
    ]) {
      expect(mapRepoHref(href)).toBe(href)
    }
  })

  // The case the changelog page was getting wrong: these render as-is and ask
  // the browser for ./docs/blog.md on the site, which is a 404.
  it("points a repo link at the file on GitHub", () => {
    expect(mapRepoHref("./docs/blog.md")).toBe(`${BLOB}/docs/blog.md`)
    expect(mapRepoHref("docs/billing.md")).toBe(`${BLOB}/docs/billing.md`)
  })

  it("resolves relative to the directory the file lives in", () => {
    expect(mapRepoHref("./README.md", "docs")).toBe(`${BLOB}/docs/README.md`)
    expect(mapRepoHref("./README.md#-tests")).toBe(`${BLOB}/README.md#-tests`)
  })

  it("sends files outside the rendered set to the repository", () => {
    expect(mapRepoHref("../ROADMAP.md", "docs")).toBe(`${BLOB}/ROADMAP.md`)
    expect(mapRepoHref("./LICENSE")).toBe(`${BLOB}/LICENSE`)
  })

  it("does not invent a link when the path climbs out of the repository", () => {
    expect(mapRepoHref("../../elsewhere.md")).toBe("../../elsewhere.md")
  })
})

describe("mapRepoMedia", () => {
  // The path GitHub reads from docs/ is the one the site serves from its root:
  // without this the image is a 404 on every deployment and fine on GitHub,
  // which is where nobody would think to look for the bug.
  it("serves a file in public/ from the site root", () => {
    expect(mapRepoMedia("../public/media/quick-setup.webp", "docs")).toBe("/media/quick-setup.webp")
    expect(mapRepoMedia("public/media/clip.mp4")).toBe("/media/clip.mp4")
  })

  it("resolves from the folder the file lives in", () => {
    expect(mapRepoMedia("../../public/media/shot.png", "content/changelog")).toBe("/media/shot.png")
  })

  it("loads a file the site does not serve from the repository", () => {
    expect(mapRepoMedia("../.github/logo.png", "docs")).toBe("https://github.com/acme/kit/raw/main/.github/logo.png")
  })

  it("leaves alone what is already a usable source", () => {
    for (const src of ["https://example.com/a.png", "/media/a.png", "data:image/png;base64,AAAA"]) {
      expect(mapRepoMedia(src, "docs")).toBe(src)
    }
  })

  it("does not invent a path when it climbs out of the repository", () => {
    expect(mapRepoMedia("../../outside.png", "docs")).toBe("../../outside.png")
  })
})

describe("isVideoPath", () => {
  it("tells videos from images, ignoring query and hash", () => {
    expect(isVideoPath("/media/clip.mp4")).toBe(true)
    expect(isVideoPath("/media/clip.WEBM?v=2")).toBe(true)
    expect(isVideoPath("/media/quick-setup.webp")).toBe(false)
    expect(isVideoPath("/media/shot.png#x")).toBe(false)
  })
})
