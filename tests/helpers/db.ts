import { Pool } from "pg"

/** Clears public application tables in the isolated integration database. */
export async function resetDatabase() {
  const connectionString = process.env["DATABASE_URL_TEST"]
  if (!connectionString) throw new Error("DATABASE_URL_TEST is required to reset the test database.")

  const pool = new Pool({ connectionString })
  try {
    const { rows } = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )
    const tables = rows.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    if (tables.length > 0) await pool.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`)
  } finally {
    await pool.end()
  }
}
