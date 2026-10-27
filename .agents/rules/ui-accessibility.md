# UI, styling and accessibility

Applies to `src/components/`, `src/app/**/*.tsx`, `src/app/globals.css`.

- Tailwind CSS 4. Use the design tokens in `globals.css` (`bg-background`,
  `text-muted-foreground`, …), not raw hex colours. Merge classes with `cn()`.
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
- **Empty blocks:** `EmptyState` (`components/layout/empty-state.tsx`): a
  standalone dashed block with an icon, a title, one sentence and the next step
  when there is one. Lists pass it to `DataTable` as `empty`; an empty list is
  never drawn as a table (no header row, no pagination): with nothing yet the
  block replaces toolbar and table, with a search or filter active the toolbar
  stays and the block says "no results" with "Clear filters". Never a bare line
  of grey text.
- **Page loading:** every page under `/dashboard` and `/admin` has a
  `loading.tsx` rendering `PageSkeleton` (`components/layout/page-skeleton.tsx`)
  in the page's shape (`list`, `form`, `cards`). Inside a section layout pass
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
