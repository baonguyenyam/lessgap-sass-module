// Prisma ORM 8 config: the contract, its emitted artefacts, and the database the
// CLI talks to. Migrations live in migrations/app (see spec/12-migrations-and-data.md).
import { config } from "dotenv";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";

// .env.local first, .env after it, and a variable already set in the shell
// still wins over both files.
config({ path: [".env.local", ".env"], quiet: true });

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "prisma/contract.prisma",
    output: "src/generated/prisma8",
    db: {
      connection: process.env["DATABASE_URL"],
    },
  }),
});
