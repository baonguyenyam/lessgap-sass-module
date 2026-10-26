# Sites, themes and verticals

**Status:** `draft`

## The split

| Owned by | Lives in | Changed by |
| --- | --- | --- |
| **Content** — name, logo, hours, address, services, prices, photos, team, menu, policies, page text | database, per tenant | tenant owner and managers, in the dashboard |
| **Design** — layout, components, typography, animation | `src/themes/<themeKey>/`, in the repo | our designers and developers, by pull request |
| **Design tokens** — colours, fonts, logo placement, corner radius | database, per tenant, validated against the theme's token schema | owner within limits the theme allows; designers fully |
| **Structure** — which sections appear on which page, in which order | database, per tenant, as section config validated by the theme | designers; owners can hide or show sections the theme marks optional |

Owners never edit layout. That is the product: we design, they keep it current.

## Themes

A theme is a folder that exports a manifest and React Server Components.

```
src/themes/aurora/
  theme.ts            manifest: key, name, kind ("shared" | "custom"), verticals it suits,
                      token schema (Zod), section registry, page templates, preview image
  tokens.ts           default tokens
  layout.tsx          site shell: header, footer, navigation
  sections/           hero.tsx, services.tsx, booking-cta.tsx, gallery.tsx, menu.tsx, …
  pages/              home.tsx, services.tsx, about.tsx, contact.tsx, book.tsx, shop.tsx, …
```

Rules:

- A theme renders data it is given. It never queries the database, reads the
  session or calls a service. The site route loads a typed `SiteData` object
  and passes it down; themes import types only.
- Interactive parts (booking widget, cart, chat bubble, quote form) are
  **module site components** from `src/modules/<module>/site/`, which every
  theme uses. A theme styles them through tokens and slots; it does not
  reimplement them. This is what keeps booking behaviour identical across 50
  differently designed sites.
- Tokens become CSS custom properties on the site root. Theme CSS uses only
  those variables, Tailwind utilities and its own classes, scoped to the site
  root.
- A section a module provides appears only when the tenant has the feature
  (`ent.has("shop")`) and has it switched on. Themes do not check plans.
- **Shared themes** (`kind: "shared"`) are what the free plan uses: a small
  set, one or more per vertical. **Custom themes** (`kind: "custom"`) are made
  for one tenant, usually by extending a shared theme: `extends: "aurora"`
  plus overridden sections. A custom theme is still generic code: tenant
  content comes from data, never from strings in the theme.
- Every theme ships a preview with fixture data (`theme.fixtures.ts`) so it
  can be reviewed without a tenant, and passes the accessibility E2E on its
  fixture site.
- Themes are registered in `src/themes/registry.ts`. A tenant's `themeKey`
  must exist there; an unknown key falls back to the vertical's default theme
  and logs an error.

### Why not a page builder or stored HTML

See [ADR 0005](./adr/0005-themes-are-code.md): type safety, review, no tenant
HTML in our origin, designers already work in code, and a builder is a product
of its own we do not want to build now.

## Verticals

A vertical is a preset applied once, at onboarding. It is a typed object in
`src/verticals/<key>.ts`:

```ts
export const nailSalon = defineVertical({
  key: "nail_salon",
  label: "Nail salon",
  defaultTheme: "aurora",
  suggestedThemes: ["aurora", "petal"],
  modules: { booking: true, shop: false, quotes: false, chatbot: true },
  terminology: { service: "service", staff: "technician", appointment: "appointment" },
  booking: { slotMinutes: 15, bufferMinutes: 5, allowAnyStaff: true },
  sampleData: {
    serviceCategories: ["Manicure", "Pedicure", "Nail art", "Waxing"],
    services: [{ name: "Classic manicure", durationMinutes: 30, priceCents: 2500 }, /* … */],
  },
  pages: ["home", "services", "book", "gallery", "about", "contact"],
})
```

Initial verticals: `nail_salon`, `barber`, `hair_salon`, `spa`, `restaurant`,
`dental`, `generic`.

- Applying a vertical writes ordinary rows (settings, categories, sample
  services marked `isSample`). After that the tenant's data is the truth; the
  vertical is not consulted again at runtime, except for `terminology`, which
  is read from the tenant's settings it was copied into.
- Sample rows are labelled in the dashboard and removable in one click.
- Changing a vertical later does not re-seed; it changes terminology and
  suggested modules only.

## Onboarding wizard

1. Business name, vertical, slug (subdomain preview live).
2. Basics: address, phone, hours, logo (optional).
3. Plan (if paid plans are offered and the tenant came without one).
4. Theme choice among the vertical's shared themes (free) or "our designers
   will build yours" (paid plans).
5. Apply vertical preset, create site, send to dashboard with a checklist:
   add services, add photos, connect payments, invite staff, add a domain.

## Rendering path

```
proxy (host → rewrite to /sites/[host]/[[...path]])
  → app/sites/[host]/layout.tsx   getSiteContext(host) → SiteData (cached, tagged)
  → theme = themes[site.themeKey]
  → theme.layout + theme.pages[pageKey] with SiteData and module site components
```

Page keys come from the theme manifest; an unknown path is the theme's 404.
