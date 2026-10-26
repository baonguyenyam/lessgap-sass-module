// Prisma ORM 8 config. Prisma ORM 7 lives on `prisma7` / prisma7.config.ts
// until nothing imports it any more; see AGENTS.md for the migration state.
import { config } from "dotenv";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";

// Same env order as prisma7.config.ts: .env.local first, .env after it, and a
// variable already set in the shell still wins over both files.
config({ path: [".env.local", ".env"], quiet: true });

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "prisma/contract.prisma",
    output: "generated/prisma8",
    db: {
      connection: process.env["DATABASE_URL"],
    },
  }),
});
