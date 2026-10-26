# Testing

- Unit tests: Vitest, `*.test.ts` next to the file under test. Run `npm test`.
- End-to-end: Playwright in `e2e/`, including `accessibility.spec.ts` (axe).
  Run `npm run test:e2e` when you change a flow those specs cover.
- New logic in `src/lib/` or `src/app/actions/` ships with tests in the same change.
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
