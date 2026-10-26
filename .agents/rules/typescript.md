# TypeScript

Applies to every `.ts` / `.tsx` / `.mts` file.

- `strict` is on and stays on. Code must pass `npx tsc --noEmit` with zero errors.
- No `any`. Use `unknown` and narrow, or a precise type. No `@ts-ignore`; if a
  `@ts-expect-error` is truly needed, put the reason on the same line.
- No non-null assertion (`!`) unless the value is guaranteed by something the
  compiler cannot see, and a comment says what.
- Derive types from their source instead of restating them:
  `z.infer<typeof schema>`, Prisma's generated types, `ReturnType<...>`.
- Validate at the boundaries (form data, request bodies, env, webhooks, external
  APIs) with Zod. Inside the boundary, trust the types.
- `import type` for type-only imports. Import app code through the `@/` alias.
- Exhaustive `switch` over unions: end with a `never` check so a new member
  fails the build.
- Prefer pure functions and `const`. No classes unless a library requires one.
- Return early instead of nesting. Functions do one thing; if a name needs
  "and", split it.
- Naming: `camelCase` values and functions, `PascalCase` types and components,
  `SCREAMING_SNAKE_CASE` for true constants, kebab-case file names. Booleans read
  as questions (`isAdmin`, `hasTrial`).
- Comments explain *why*, not *what*. Match the existing comment style: full
  sentences, in English.
- No `console.log` left in committed code. Use the existing error paths.

---

Based on: the TypeScript handbook's strict-mode guidance and the type-safety rules of `typescript-eslint`, adapted to this codebase's style.
