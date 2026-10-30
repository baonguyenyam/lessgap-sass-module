# UI, styling and accessibility

Applies to `src/components/`, `src/app/**/*.tsx`, `src/app/globals.css`.

- Tailwind CSS 4. Use the design tokens in `globals.css` (`bg-background`,
  `text-muted-foreground`, …), not raw hex colours. Merge classes with `cn()`.
- **Status surfaces use matching semantic colours** across their border, tint,
  text and icon; do not leave a neutral grey border on a danger, warning, info,
  success or accent surface. Use the corresponding semantic token (`destructive`,
  `warning`, `info`, `success` or `accent`); if one is missing, add a theme token
  that works in light and dark themes. Keep a text or icon label so colour is not
  the only status signal, and preserve WCAG contrast.
- **`src/components/ui/` is stock shadcn/ui** (spec/adr/0021: "radix-nova"
  style, copied from Studio Admin, attribution in `NOTICE`). Do not restyle a
  stock component; add one with `npx shadcn add <name>` and point `cn` at
  `@/lib/utils`. Our own building blocks live elsewhere (`components/data-table`,
  `components/layout`). The only extensions are marked in the file (Button
  `gradient` and `xl` for the marketing site, Badge `success`).
- **Stock sizes only**: Button `xs` / `sm` / `default` / `lg` / `icon*`, and
  fields at their default height, which matches a default button. Never set a
  field's height by hand; a busy button is `disabled` with a `<Spinner />`
  inside, not a `loading` prop.
- **Picking from a list:** `OptionSelect` (`components/form/option-select.tsx`)
  in client components: the stock Select up to 8 options, searchable from 9
  on. `NativeSelect` only in forms rendered on the server. Never a raw `Select`
  or a bare `<select>` elsewhere.
- **Waiting for data**, one answer per case: a page or section loading shows a
  skeleton of its layout (`Skeleton`); a single field fetching its own data
  shows a spinner inside it with `aria-busy` (`loading` on `OptionSelect`, the
  DataTable search); a form being saved locks its fields and puts the spinner in
  the submit button only. Never a frozen field with no sign of life, and never
  a spinner in every field of a page.
- **Empty blocks:** match the tenant Newsletter page: `EmptyState`
  (`components/layout/empty-state.tsx`) is a standalone full-width dashed block
  with a centered icon in a muted circle, bold centered title, muted centered
  description, and the next step when there is one. The title is short with no
  full stop ("No orders yet"); the description is one sentence on what fills
  it ("Orders placed on your site's shop page appear here."), kept as a
  `<key>_hint` string beside the title key. A test fails on a non-compact box
  without a description. Lists pass it to `DataTable`
  as `empty`; an empty list is
  never drawn as a table (no header row, no pagination): with nothing yet the
  block replaces toolbar and table, with a search or filter active the toolbar
  stays and the block says "no results" with "Clear filters". An empty list or
  section renders the block **instead of** its card — never a card around the
  block, never a "0 items" heading above it (owner, 2026-10-30). Only a frame
  that must stay keeps it (a board column, a named category card): there the
  block is `size="compact"` and drops its own border (`className="border-0"`),
  so it never reads as a box inside a box. A page that holds several sibling
  list sections puts them in `Tabs` (`components/ui/tabs.tsx`), one box at a
  time — the tab label is the section's name, never a count ("Requests", not
  "0 requests"), and the card inside a tab drops its `CardHeader` (owner,
  2026-10-30: two stacked empty boxes look like a bug). Never a bare line
  of grey text. Every module page follows this; a test in
  `tests/unit/ui-consistency.test.ts` fails on a bare empty line. Public sites
  (`src/app/sites`) are themed and exempt.
- **Page loading:** every page under `/dashboard` and `/admin` has a
  `loading.tsx` rendering `PageSkeleton` (`components/layout/page-skeleton.tsx`)
  in the page's shape (`list`, `form`, `cards`). Skeletons are grey blocks only: no
  border, frame or card around them (the owner found a framed skeleton heavy
  on every page change). Inside a section layout pass
  `header={false}`: the title and tabs stay on screen.
- **Language files:** every string goes into `en.json` and, in the same change,
  into every other file in `src/locales/` with the same key; a test fails on a
  missing or stale key.
  Use a searchable combobox when options are long or come from database records;
  fetch remote matches through an API instead of loading the whole dataset into
  the page. Select menus open below/away from their trigger so the menu does not
  cover the selected control.
- **Async fields show their loading state.** While a field's options or value
  are being fetched, show a localized loading indicator or skeleton, prevent
  invalid interaction, and keep the field's layout stable. Do not render an
  empty-looking field that appears ready while data is still pending.
- **Sub-pages of a section use vertical tabs:** `SectionLayout` + `SectionNav`
  from `src/components/ui/section-nav.tsx`, rendered by the section's layout.
- **Every list is a `DataTable`** (`src/components/data-table/`): search,
  filters, sort and pagination in the URL, applied on the server; a checkbox
  column with bulk actions; an actions column; create and edit in a `Sheet`
  drawer, not a separate page.
- **Drawers are `FormDrawer`** with a `size` that fits the content: `sm` one
  field, `md` a short form, `lg` long text, `xl` a grid of options. Put fields
  side by side with a grid in its children when they belong on one line.
- **No shadows.** Separate surfaces with a border or a ring. The shadow scale
  is flattened in `globals.css`; a test fails on `shadow-*` outside
  `src/components/ui/`.
- **Avoid card inside card.** Prefer one clear surface with sections, headings,
  and dividers. Nest a card only when the inner surface represents a distinct
  interactive or semantic group; avoid decorative layers that add borders and
  padding without clarifying the content (for example, account notifications).
- **Forms:** React Hook Form with `zodResolver` and a schema from
  `src/lib/schemas/`; the server action parses the same schema again.
- Icons from `lucide-react`. Toasts through `sonner`.
- **Every button carries an icon** (lucide, before the label), and so does every
  dropdown item; icon-only buttons need an `aria-label`. `RowAction` and
  `BulkAction` require `icon`, so the type checker enforces it in tables.
- **Menus are grouped:** a `DropdownMenuLabel`, related items in a
  `DropdownMenuGroup`, and destructive items last, in their own group after a
  separator, with `variant="destructive"`. No emoji anywhere in the UI.
- Both light and dark themes must look right; check anything you add in both.
- Mobile first; check the layout at phone width.
- Target WCAG 2.1 AA:
  - every input has a `<Label>`; every icon-only button has an accessible name;
  - interactive elements are real `button` / `a` elements, reachable and usable by keyboard,
    with a visible focus ring;
  - colour is never the only signal; text contrast at least 4.5:1;
  - decorative images get `alt=""` and `aria-hidden`; meaningful ones a real `alt`.
- All visible text comes from `src/locales/en.json` (see AGENTS.md).

---

Based on: [WCAG 2.1 AA](https://www.w3.org/TR/WCAG21/) and the Tailwind CSS 4 and Radix UI docs.

## Sidebar + header + list conventions (shadcn-admin)

The app shell follows [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)
conventions — check it before adding nav or list chrome. For the pages
themselves (Profile, Settings, Tenants and the other console and dashboard
pages) the first reference is **platform.madelab.io**: match its layout and
behaviour for most pages. Both are references for structure and behaviour
only — never copy their code, and keep the kit neutral (owner's rule,
2026-10-30, `.agents/memory/requirements.md`).

- **Sidebar header in a tenant's dashboard is the tenant switcher alone** — no
  app logo above it (owner, 2026-10-30); the admin panel and the platform
  console keep the app logo as their header.
- **Sidebar header is a dropdown** — the current tenant's name + icon opens a
  menu of the user's tenants (icon + name + `⌘N` shortcut each) ending in an
  "Add team" row that starts tenant creation.
- **Sidebar ends in a copyright footer** — "© {year} {site name}" under the
  menu (`SidebarFooter`, site name from `siteConfig`, year from the shared
  current-year helper), hidden when the sidebar is collapsed to icons.
- **Sidebar items can carry a submenu** — a parent item with `children` renders
  a chevron that expands/collapses the children (`NavCollapsible`), the way
  "Secured by Clerk" opens Sign In / Sign Up / User Management. Group items
  under a parent when they belong to the same domain rather than adding a flat
  sibling.
- **Top-right chrome is a row of icon buttons** — search, language, theme,
  account: all the same ghost icon button, no text and no field (owner,
  2026-10-30). Search opens the command modal (click or ⌘K / Ctrl+K, shown
  in its tooltip); account opens the dropdown below it: avatar initials open a menu with
  the user's name + email, Profile, Billing, Settings, "New team", and a red
  Sign out — each with its keyboard shortcut shown right-aligned.
- **Account and settings pages share one layout** (platform.madelab.io's
  `/profile` and settings): `SectionLayout` + `SectionNav` from
  `src/components/layout/section-nav.tsx`. On the left, the section menu
  grouped under small uppercase headings (Account / Security / Data;
  Workspace / Features / Preferences), an icon per item, the active item
  filled. Account pages open with the identity card (`ProfileHero`: photo,
  name, address, "Member since", status badges) instead of a title;
  settings pages open with title + description. The menu lists only the
  pages that open for the viewer (permission and module, as in the
  sidebar), and every page under the layout has an entry (tested in
  `tests/unit/lib/settings-pages.test.ts`). A page's content is a card per
  topic: header with title + description, then the fields, then the
  actions right-aligned (secondary, then primary).
- **A list page's heading carries its actions on the right** — title and
  description on the left, the button group on the right of the same row
  (secondary such as "Import" first, the primary "Create" last), never under
  the heading.
- **A table's toolbar carries filter pills + a view toggle** — in one row
  under the heading: the free-text filter input, then one dashed pill per
  facet ("Status", "Priority", any enum the list has) opening a searchable
  checklist with an icon and a count per option, and the "View"
  column-visibility toggle at the far right.
- **A table row starts with a select checkbox and ends with a "…" menu** —
  the header checkbox selects the page, sortable column headers show the
  up/down chevrons. When the last column holds the row's actions, they are a
  "…" dropdown, never a row of buttons; when the last column is data, it is
  right-aligned (header and cells).
- **Bulk actions appear under the table, never above it** — selecting rows
  shows a floating bar centred in the footer row, between "Rows per page" and
  the pager: a clear (×) button, the count as a badge ("N selected"), icon
  buttons for the bulk actions (each with a tooltip and an accessible name),
  and the destructive one filled red. It does not replace or push the
  toolbar, and it is not a toggle above the table (owner, 2026-10-30).
- **Pagination sits under the table** — "Rows per page" on the left, the page
  indicator ("Page X of Y") and first / previous / numbered pages (with "…")
  / next / last buttons on the right, the current page filled.
- **Badges come from one component, in colour** — every status is drawn by
  `StatusBadge` (`src/components/data-table/status-badge.tsx`), never a
  feature's own coloured `<span>` or a raw `<Badge variant>` per status. A
  domain keeps one `StatusMap` (value → tone + leading icon) and passes the
  translated label; tones are neutral, info, success, warning, danger,
  muted (the `info` / `warning` / `success` Badge variants back them). Kinds
  and roles that are not statuses may stay plain `Badge`.
- **List building blocks** — `DataTable` draws all of the above: pass
  `heading` (title, description) and `actions` to get the heading with its
  buttons on the right; `filters` become `FacetFilter` pills (options take an
  optional `icon` and `count`); data columns with a text header appear in
  "View"; the pager uses `pageItems` from `src/lib/pagination.ts`. A page
  without a table uses `PageHeader` (`src/components/layout/page-header.tsx`)
  for the same heading.

## Locales: en + vi only (owner, 2026-10-30)

- **Two locales ship — `en` and `vi`.** `src/locales/` holds only those two
  files and `routing.locales` lists only them; more languages come later,
  deliberately, not seeded.
- A user-facing string still enters `en.json` first and `vi.json` beside it;
  `pnpm check:messages` + `messages.test.ts` keep the pair honest.
