# 0016. Every test lives in tests/

**Status:** accepted (requested by the product owner, 2026-10-26)
**Date:** 2026-10-26

## Context
Unit tests sat beside their source (`src/lib/foo.test.ts`), script tests in
`scripts/`, Playwright specs in `e2e/`, and the shared database double in
`src/test/`. The product owner asked for all tests in one place, `tests/`.
spec/11-testing.md already put integration and contract tests there.

## Decision
- `tests/unit/` mirrors `src/`: `src/lib/ids.ts` → `tests/unit/lib/ids.test.ts`,
  `src/app/actions/admin.ts` → `tests/unit/app/actions/admin.test.ts`.
- `tests/unit/scripts/` holds the tests of the plain Node helpers in `scripts/`,
  imported through `#scripts/...` (package.json `imports`).
- `tests/e2e/` holds the Playwright and axe specs; `tests/integration/` and
  `tests/contract/` keep their place from spec/11-testing.md.
- `tests/helpers/` holds shared test doubles, imported as `@tests/...`
  (tsconfig `paths`, Vitest `alias`).
- Tests import the code under test through `@/`, never `./` or `../`.
- Vitest collects `tests/unit/**` only, and `tests/unit/repo-layout.test.ts`
  fails on any test file under `src/` or `scripts/`.

## Consequences
- Production folders hold production code only; one glob finds every test.
- A test is a path away from its source instead of beside it: the mirrored
  path is what keeps them findable, so a moved source file moves its test.

## Options considered
- **Keep tests beside the source:** easiest to find and to keep in step, and
  what the kit did until now; rejected by the product owner.
- **One flat tests/ folder:** shorter paths, but loses the link between a test
  and its source.
