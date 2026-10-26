-- Better Auth owns writes to this table now (Kysely adapter), and its
-- two-factor model has no timestamp columns — a NOT NULL `updatedAt` with no
-- default makes every insert fail. The client-side `@onUpdate(now())` in the
-- Prisma 8 contract keeps the ORM path honest; this default covers writes
-- that do not come through it.
ALTER TABLE "TwoFactor" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
