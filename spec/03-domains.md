# Domains

**Status:** `draft`

## Two apex domains

| Domain | Example | Serves |
| --- | --- | --- |
| Platform | `madelab.io` (to decide) | `www` marketing, `app` dashboard and platform console |
| Tenant sites | `madelab.site` (to decide) | `<slug>.madelab.site`, one per tenant |

Tenant sites live under a **different apex** from the dashboard. Without that,
a tenant subdomain is "same site" as `app.` for browsers, and anything served
on one tenant subdomain can set cookies that reach the dashboard and other
tenants. We do not serve tenant scripts today, but themes can embed
third-party widgets and the separation is free now and expensive later. The
sites domain is also submitted to the Public Suffix List once it is live.

Session cookies on `app.` use the `__Host-` prefix, `Secure`, `HttpOnly`,
`Path=/` and no `Domain` attribute. Customer sessions on tenant sites are
host-only cookies on the tenant's hostname.

## Subdomains

- Every tenant gets `<slug>.<sites-domain>` at creation. The slug is chosen in
  onboarding: lowercase letters, digits and single hyphens, 3–40 characters,
  unique, not in the reserved list (`www`, `app`, `api`, `admin`, `mail`,
  `status`, `help`, `docs`, `blog`, `cdn`, `static`, and every platform route
  name).
- The sites apex uses Vercel nameservers so Vercel can issue the wildcard
  certificate for `*.<sites-domain>`; no per-tenant certificate is needed.
- Renaming a slug is a plan feature (`domain.slug.rename`). The old subdomain
  redirects (308) to the new one for 90 days.

## Custom domains

Plan feature `domain.custom` (with a limit `domain.custom.max`).

1. The owner enters `example.com` or `www.example.com` in **Settings → Domain**.
2. The platform validates it (syntax, not a platform domain, not already
   claimed by another tenant), stores a `Domain` row with status `pending`, and
   calls the Vercel API to add it to the project. For an apex we add both the
   apex and `www`, and set the one the owner did not choose to redirect to the other.
3. The dashboard shows the exact DNS records to create, taken from the Vercel
   response, not from constants:
   - subdomain (`www.example.com`): `CNAME` to the value Vercel returns
     (currently `cname.vercel-dns.com`);
   - apex (`example.com`): `A` record to the value Vercel returns
     (currently `76.76.21.21`);
   - a `TXT` record when Vercel requires ownership verification because the
     domain is already used on Vercel.
4. A job re-checks pending domains every 10 minutes for 72 hours, then daily
   for 7 days, then marks them `failed` and emails the owner. The owner can
   press **Check now** (rate-limited, the Vercel API allows 50 verifications
   an hour per team).
5. When verified and the certificate is issued, status becomes `active`. The
   owner chooses which hostname is primary; all others redirect (308) to it,
   and the site's canonical URL uses it.
6. Removing a domain removes it from the Vercel project and deletes the row.
   Canceling the plan feature schedules removal after the grace period.

All Vercel calls go through `src/platform/domains/vercel.ts`. Nothing else
talks to the Vercel API.

## Host resolution

`resolveHost(host)` in `src/platform/tenancy/host.ts`, used by the proxy and
by `getSiteContext`:

1. Normalise: lowercase, strip port, strip a trailing dot.
2. Platform hosts → surface `marketing` or `app`.
3. `<slug>.<sites-domain>` → tenant by slug (active only).
4. Otherwise → `Domain` by hostname with status `active` → its tenant.
5. Not found → 404 page for the sites domain, plain 404 elsewhere.

The result is cached for 60 seconds and invalidated by tag when a domain or
slug changes. Local development uses `<slug>.localhost:3000` and a
`DEV_TENANT_HOST_MAP` env variable for custom-domain testing.

## SEO

- Each site has one canonical origin: the primary domain.
- `robots.txt` and `sitemap.xml` are generated per host. Suspended or
  provisioning sites return `noindex`.
- The subdomain of a tenant with an active custom domain redirects to it.
