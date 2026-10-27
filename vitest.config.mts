import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * Unit tests for the pure logic in src/lib: the rate limiter, the Markdown
 * parsers behind the blog, docs and changelog, and the small helpers. Plus the
 * pure parts of the scripts in scripts/, which run outside the build.
 *
 * Deliberately out of scope: anything that talks to an external service
 * (db8.ts, stripe.ts, email.ts). Those need integration tests with a real
 * client, not unit tests against a mock that only proves the mock works.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Every test lives under tests/ (spec/adr/0016-tests-live-in-tests.md):
    // tests/unit mirrors src/, and tests/unit/scripts holds the plain ESM tests
    // of the pure helpers the deploy checks in scripts/ are built on.
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      // Coverage is reported over pure library and platform convention logic.
      // Measuring it over all of src/ would mix in React components and route
      // handlers that unit tests were never meant to cover, and produce a
      // number that says nothing about either.
      include: [
        "src/lib/**/*.ts",
        "src/platform/action.ts",
        "src/platform/errors.ts",
        "src/platform/log.ts",
        "src/platform/money.ts",
        "src/platform/time.ts",
      ],
      // Thin wrappers around external services: covering them means asserting
      // against a mock of Prisma, Stripe or Resend, which proves the mock works.
      exclude: ["src/lib/db8.ts", "src/lib/stripe.ts", "src/lib/email.ts"],
    },
  },
  resolve: {
    // import.meta.dirname, not __dirname: this config is ESM and Vite's native
    // loader (the coming default) rejects the CommonJS global.
    alias: {
      "@tests": path.resolve(import.meta.dirname, "tests"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
})
