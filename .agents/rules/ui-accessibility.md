# UI, styling and accessibility

Applies to `src/components/`, `src/app/**/*.tsx`, `src/app/globals.css`.

- Tailwind CSS 4. Use the design tokens in `globals.css` (`bg-background`,
  `text-muted-foreground`, …), not raw hex colours. Merge classes with `cn()`.
- Build on `src/components/ui/` (Radix primitives). Variants go through
  `class-variance-authority`, like the existing components.
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
