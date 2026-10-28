import { auth } from "@/auth"
import { isRoot } from "@/lib/roles"
import { NextResponse, type NextRequest } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { newTimeId } from "@/lib/ids"
import {
  acceptRequestId,
  REQUEST_ID_HEADER,
  REQUEST_SOURCE_HEADER,
  sourceForPath,
  LAST_TENANT_COOKIE,
  TENANT_SLUG_HEADER,
  tenantSlugFromPath,
} from "@/platform/request-context"
import { invitationIdFromPath, PENDING_INVITATION_COOKIE } from "@/lib/invitations"
import { isTenantMember } from "@/platform/tenancy/require-member"

/**
 * Locale handling for the public surface only.
 *
 * The private areas below are matched by prefix, and a locale segment in front
 * of `/dashboard` would stop those prefixes from matching: `/it/dashboard`
 * would not look protected. Rather than teach every list here to strip a
 * locale, the private areas stay outside the prefix entirely, so those URLs do
 * not exist. See `src/i18n/routing.ts` for how to lift that if you want your
 * dashboard localized.
 */
const intlMiddleware = createIntlMiddleware(routing)

/**
 * Everything that must never carry a locale prefix.
 *
 * Two kinds of thing end up here. The private areas and the sign-in pages,
 * which live outside `src/app/[locale]/` by design. And the root level
 * metadata routes, which Next serves from `src/app/` directly: prefixing those
 * asks for `/en/sitemap.xml`, which does not exist, so the file 404s instead of
 * being served. That failure is quiet in the worst way, since nothing links to
 * a favicon or a sitemap from inside the app.
 *
 * Adding a file at the root of `src/app/` means adding it here too.
 */
const UNLOCALIZED = [
  // Private areas and auth, matched by prefix.
  "/dashboard",
  "/t/",
  "/admin",
  "/platform",
  "/api",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-request",
  "/2fa",
  "/invite",
  // Root level metadata routes.
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/icon",
  "/opengraph-image",
]

/**
 * Private surfaces, matched by prefix. Anything not listed here falls through
 * to the router, so a URL that does not exist renders your 404 page.
 *
 * This is a denylist on purpose. With the allowlist it replaced, every path
 * the list did not know about looked private: a typo like `/dashboar` instead
 * of `/dashboard` was bounced to `/login`, and an anonymous visitor never saw the 404
 * page at all. Loosening the proxy opens nothing, because each private area
 * already gates itself server-side: `(dashboard)/layout.tsx` and
 * `(admin)/layout.tsx` call `auth()` and redirect, and the private API routes
 * each return 401 on their own. Treat this file as defence in depth, and add
 * a prefix here when you add a private area outside `/dashboard`.
 */
const PROTECTED_ROUTES = ["/dashboard", "/t/", "/platform", "/api/checkout", "/api/billing"]
const ADMIN_ROUTES = ["/admin", "/api/admin"]
// `/2fa` belongs here for the same reason as the other two: it is a step on the
// way in, so somebody who already holds a session has nothing to do on it. The
// second factor is asked for BEFORE a session exists, which is why sending a
// signed-in visitor to the dashboard cannot interrupt a verification.
const AUTH_ROUTES = ["/login", "/signup", "/2fa"]

// Reading the session here means one database round trip per request, where
// the old JWT was verified in memory. `session.cookieCache` in src/auth.ts is
// what buys most of them back. Next.js 16 is what makes this possible at all:
// on older versions the proxy could only look at the cookie without validating
// it, which the Better Auth docs are blunt about ("THIS IS NOT SECURE").
//
// Either way this is a redirect layer, not the authorization: the real check
// lives in requireUser() and requireAdmin(), on the page.
//
// The session is read only on the routes in the three lists above. Nothing
// else here depends on it, and reading it on every request (the home, the
// changelog, link prefetches, crawlers) cost a round trip and function
// time on each one: on Vercel that was most of a small site's CPU.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Every request carries an id and its surface (spec/16-operations.md): on
  // the request, for the server code and `log.error` to read, and on the
  // response, so a person reporting a problem can quote it. An id an upstream
  // proxy already set is kept when it looks like one.
  const requestId = acceptRequestId(req.headers.get(REQUEST_ID_HEADER)) ?? newTimeId()
  req.headers.set(REQUEST_ID_HEADER, requestId)
  req.headers.set(REQUEST_SOURCE_HEADER, sourceForPath(pathname))
  // The tenant of a dashboard request comes from the path, never from a header
  // the client sent (task 1.7): set it on /t/<slug>/…, strip it everywhere else.
  const tenantSlug = tenantSlugFromPath(pathname)
  if (tenantSlug) req.headers.set(TENANT_SLUG_HEADER, tenantSlug)
  else req.headers.delete(TENANT_SLUG_HEADER)
  const stamped = (res: NextResponse) => {
    res.headers.set(REQUEST_ID_HEADER, requestId)
    return res
  }
  const next = () => stamped(NextResponse.next({ request: { headers: req.headers } }))

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))

  const session =
    isAuthRoute || isAdminRoute || isProtectedRoute ? await auth.api.getSession({ headers: req.headers }) : null
  const isLoggedIn = !!session
  const isRootUser = isRoot(session?.user?.role)

  // `/api/auth` and the inbound webhooks (e.g. Stripe) carry no session and
  // need no special case here: they are not in the lists above, so they pass.
  if (isAuthRoute && isLoggedIn) {
    return stamped(NextResponse.redirect(new URL("/dashboard", req.nextUrl)))
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return stamped(NextResponse.redirect(new URL("/login", req.nextUrl)))
    if (!isRootUser) return stamped(NextResponse.redirect(new URL("/dashboard", req.nextUrl)))
    return next()
  }

  if (isProtectedRoute && !isLoggedIn) {
    return stamped(NextResponse.redirect(new URL("/login", req.nextUrl)))
  }

  // A tenant someone does not belong to is answered here, before the page
  // streams: past that point the status is already 200 and the tenant layout
  // can only render the 404 page, not send a 404 (T6). The layout keeps its
  // own check for what reaches it.
  if (tenantSlug && session && !(await isTenantMember(session.user.id, tenantSlug))) {
    return stamped(NextResponse.rewrite(new URL("/_not-found", req.nextUrl), { status: 404 }))
  }

  // Past the guards. Anything that is not a private area is public surface, so
  // it goes through locale resolution; the private areas keep the plain
  // response they have always had.
  if (UNLOCALIZED.some((r) => pathname.startsWith(r))) {
    const res = next()
    // An invitation link opened signed out: `/dashboard` sends the person back
    // to it once they have signed in or up (task 1.8).
    const invitationId = invitationIdFromPath(pathname)
    if (invitationId && !isLoggedIn) {
      res.cookies.set(PENDING_INVITATION_COOKIE, invitationId, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
    }
    // Remember the tenant opened, so `/dashboard` (and the links that still
    // point there) lands on it next time. A slug the user is not a member of
    // is ignored where the cookie is read, and 404s in the tenant layout.
    if (tenantSlug && isLoggedIn && req.cookies.get(LAST_TENANT_COOKIE)?.value !== tenantSlug) {
      res.cookies.set(LAST_TENANT_COOKIE, tenantSlug, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })
    }
    return res
  }

  // next-intl forwards `req.headers`, so the id set above reaches the page.
  return stamped(intlMiddleware(req))
}

// Static files in public/ skip the proxy. Videos are listed too: without them
// next-intl took /videos/clip.mp4 for a page and answered 404.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)"],
}
