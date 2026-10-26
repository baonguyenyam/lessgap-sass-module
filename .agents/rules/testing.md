# Testing

- Unit tests: Vitest, `*.test.ts` next to the file under test. Run `pnpm test`.
- End-to-end: Playwright in `e2e/`, including `accessibility.spec.ts` (axe).
  Run `pnpm test:e2e` when you change a flow those specs cover.
- Integration tests (from phase 0): `tests/integration/`, real PostgreSQL,
  `pnpm test:integration`. Never mock Prisma there. Tenant isolation, RLS,
  constraints, concurrency and webhooks are proven at this layer.
- The mandatory cases for each area are listed in `spec/11-testing.md`; a
  phase is not done until its rows exist as tests.
- New logic in `src/lib/`, `src/platform/` or `src/modules/` ships with tests in the same change.
- A bug fix starts with a test that fails for the bug, then the fix makes it pass.
- Test behaviour, not implementation: inputs and outputs, not which private
  helper was called. One behaviour per `it`, named as a sentence in English
  (`it("refuses a name longer than 60 characters")`).
- Arrange, act, assert. Keep fixtures small and local to the test file.
- Cover the edges: empty, too long, missing, wrong owner, duplicate, boundary values.
- No network, no real database, no real clock in unit tests. Mock at the module
  boundary (`vi.mock`) or pass the dependency in.
- Never weaken, skip or delete a failing test to make a change pass. If a test
  is wrong, say so and explain why before changing it.

---

Based on: the Vitest and Playwright docs, and the test-first bug fix of Karpathy's goal-driven execution (see AGENTS.md).
