# UI, styling and accessibility

Applies to `src/components/`, `src/app/**/*.tsx`, `src/app/globals.css`.

- Tailwind CSS 4. Use the design tokens in `globals.css` (`bg-background`,
  `text-muted-foreground`, …), not raw hex colours. Merge classes with `cn()`.
- Build on `src/components/ui/` (shadcn/ui on Radix). Variants go through
  `class-variance-authority`, like the existing components.
- **Fields share one size scale** (`src/components/ui/field.ts`): `sm` (36px)
  in toolbars and filters, `md` (40px) in forms, `lg` (48px pill) on the auth
  pages. A button beside a field takes the same size name. Never set a field's
  height by hand.
- **Selects:** `Select` in client components; `NativeSelect` in forms
  rendered on the server. Never a bare `<select>`: its arrow sits against the border.
- **Sub-pages of a section use vertical tabs:** `SectionLayout` + `SectionNav`
  from `src/components/ui/section-nav.tsx`, rendered by the section's layout.
- **Every list is a `DataTable`** (`src/components/data-table/`): search,
  filters, sort and pagination in the URL, applied on the server; a checkbox
  column with bulk actions; an actions column; create and edit in a `Sheet`
  drawer, not a separate page.
- **Forms:** React Hook Form with `zodResolver` and a schema from
  `src/lib/schemas/`; the server action parses the same schema again.
- Icons from `lucide-react`. Toasts through `sonner`.
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
