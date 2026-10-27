# Next.js and React

Applies to `src/app/`, `src/components/`, `src/hooks/`.

This project runs Next.js 16 and React 19. APIs changed across 14 → 15 → 16;
check `node_modules/next/dist/docs/` before relying on what you remember.

## Server first

- Components are Server Components by default. Add `"use client"` only to the
  smallest leaf that needs state, effects, event handlers or browser APIs, and
  pass server data down to it as props.
- Fetch data on the server (in the page, layout or a server function), not in a
  client `useEffect`.
- Route `params` and `searchParams` are Promises: `const { locale } = await params`.
- Never import server-only modules (`@/lib/db8`, `@/lib/stripe`, secrets,
  `next/headers`) into a file marked `"use client"`.

## Server actions

Follow the shape already used in `src/app/actions/projects.ts`, in this order:

1. `const user = await getCurrentUser()` from `@/lib/auth`; return an error if null.
2. Parse the input with a schema from `src/lib/schemas/` (`safeParse`, never trust `FormData`).
3. Check ownership or role for every id the client sent (`existing.userId !== user.id`).
4. Do the write.
5. `revalidatePath` what changed, then return a typed state or `redirect`.

- A `"use server"` file may only export async functions. Put schemas, types and
  constants in `src/lib/` so client components can import them.
- Error messages returned to the user come from `getTranslations`.
- Forms use `useActionState` with the action, plus the shared schema for
  client-side hints only.

## Route handlers

- Live in `src/app/api/**/route.ts`. Validate the body, authenticate, and return
  `NextResponse.json` with an explicit status.
- Webhooks read the raw body (`await req.text()`) and verify the signature
  before anything else.

## Components

- Reuse `src/components/ui/` before writing a primitive. Compose with `cn()` from `@/lib/utils`.
- One component per file, named export, file name in kebab-case.
- Components render; decisions (pricing, permissions, formatting rules) live in
  `src/lib/` as tested functions.
- Every list item has a stable `key` (an id, never the array index for data that can reorder).
- Every page under `/dashboard` and `/admin` has a `loading.tsx` with
  `PageSkeleton` (a test checks it). Errors inside the app are caught by
  `error.tsx` in `(dashboard)/dashboard` and `(admin)/admin`, which render
  `RouteError` (the EmptyState block, Next's `retry()`, the error digest).
- **Typed routes are on** (`typedRoutes` in `next.config.ts`): `href`,
  `redirect()` and `router.push()` take a `Route`. Type route constants and
  config as `Route` (`import type { Route } from "next"`) instead of `string`.
  Link to the public home through `HOME` from `@/config/site` (typed routes
  see it as `/[locale]`). Cast with `as Route` only for a URL that is not ours
  (an OAuth provider, the demo) or a path built at runtime from the current one.
- View transitions: React's `<ViewTransition>` with `default="none"`, so only
  the named case animates (today: the skeleton fading out, `.skeleton-reveal`).
  Every animation has a `prefers-reduced-motion` override in `globals.css`.

## Metadata and structured data

- Page metadata goes through `src/lib/metadata.ts`; JSON-LD through
  `jsonLdScript()` in `src/lib/json-ld.ts`, built from the same value the page renders.

---

Based on: the Next.js docs shipped in `node_modules/next/dist/docs/` and the React docs (react.dev), narrowed to the patterns this codebase uses.
