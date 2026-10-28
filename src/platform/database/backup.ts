import { createGzip } from "node:zlib"
import pg from "pg"
import { siteConfig } from "@/config/site"
import { ownerUrl } from "@/lib/database-url"
import { putObject } from "@/platform/storage/r2"
import {
  backupKey,
  copyHeader,
  copyRow,
  dumpFooter,
  dumpHeader,
  loadOrder,
  qualifiedName,
  type ForeignKey,
  type TableRef,
} from "@/platform/database/sql-dump"

/**
 * Takes a data-only backup of the `public` schema and stores it in R2
 * (spec/adr/0023). Every table is read in one REPEATABLE READ snapshot through
 * a server-side cursor, with values in Postgres's own text form, so the file
 * is exactly what the database held at one instant.
 *
 * The gzipped file is built in memory and uploaded in one request: fine for
 * the sizes v1 targets, and the limit the ADR names.
 */

const BATCH = 1000

/** Values as Postgres prints them: no parsing, so nothing is lost or reformatted. */
const rawText = { getTypeParser: () => (value: string) => value } as unknown as pg.CustomTypesConfig

export type BackupResult = { key: string; size: number; tables: number; rows: number }

export type Dump = { takenAt: Date; contractHash: string | null; body: Buffer; tables: number; rows: number }

/** A client on the direct host: a cursor held across a long read does not survive Neon's pooler. */
export function directClient(): pg.Client {
  // The owner role (spec/12): the app role would see only what RLS lets one tenant see.
  const url = ownerUrl(process.env)
  if (!url) throw new Error("DATABASE_URL is not set")
  return new pg.Client({ connectionString: url })
}

/** Takes the backup and stores it under `platform-backups/`. */
export async function createBackup(startedBy: string): Promise<BackupResult> {
  const dump = await dumpDatabase()
  const key = backupKey(dump.takenAt)
  await putObject(key, dump.body, {
    contentType: "application/gzip",
    metadata: {
      "app-version": siteConfig.version,
      "contract-hash": dump.contractHash ?? "unknown",
      "started-by": startedBy,
    },
  })
  return { key, size: dump.body.length, tables: dump.tables, rows: dump.rows }
}

/** The gzipped SQL of one consistent snapshot of the `public` schema. */
export async function dumpDatabase(): Promise<Dump> {
  const takenAt = new Date()
  const gzip = createGzip()
  const chunks: Buffer[] = []
  gzip.on("data", (chunk: Buffer) => chunks.push(chunk))
  const finished = new Promise<void>((resolve, reject) => {
    gzip.on("end", resolve)
    gzip.on("error", reject)
  })
  const write = (text: string) => gzip.write(text)

  const client = directClient()
  await client.connect()
  let rows = 0
  let tables: TableRef[] = []
  let contractHash: string | null = null
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")

    const marker = await client.query<{ exists: boolean }>(
      "SELECT to_regclass('prisma_contract.marker') IS NOT NULL AS exists"
    )
    if (marker.rows[0]?.exists) {
      const hash = await client.query<{ core_hash: string }>(
        "SELECT core_hash FROM prisma_contract.marker WHERE space = 'app'"
      )
      contractHash = hash.rows[0]?.core_hash ?? null
    }

    const tableRows = await client.query<{ schema: string; name: string }>(`
      SELECT n.nspname AS schema, c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition`)
    const fkRows = await client.query<{ from_schema: string; from_name: string; to_schema: string; to_name: string }>(`
      SELECT fn.nspname AS from_schema, f.relname AS from_name, tn.nspname AS to_schema, t.relname AS to_name
      FROM pg_constraint k
      JOIN pg_class f ON f.oid = k.conrelid JOIN pg_namespace fn ON fn.oid = f.relnamespace
      JOIN pg_class t ON t.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = t.relnamespace
      WHERE k.contype = 'f' AND fn.nspname = 'public'`)
    const foreignKeys: ForeignKey[] = fkRows.rows.map((r) => ({
      from: { schema: r.from_schema, name: r.from_name },
      to: { schema: r.to_schema, name: r.to_name },
    }))
    tables = loadOrder(tableRows.rows, foreignKeys)

    write(dumpHeader({ takenAt, appVersion: siteConfig.version, contractHash }))

    for (const table of tables) {
      const columnRows = await client.query<{ name: string }>(
        `SELECT a.attname AS name FROM pg_attribute a
         WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
         ORDER BY a.attnum`,
        [qualifiedName(table)]
      )
      const columns = columnRows.rows.map((r) => r.name)
      if (columns.length === 0) continue

      write(`${copyHeader(table, columns)}\n`)
      const select = columns.map((c) => `"${c.replaceAll('"', '""')}"`).join(", ")
      await client.query(`DECLARE backup_cursor NO SCROLL CURSOR FOR SELECT ${select} FROM ${qualifiedName(table)}`)
      for (;;) {
        const batch = await client.query<(string | null)[]>({
          text: `FETCH ${BATCH} FROM backup_cursor`,
          rowMode: "array",
          types: rawText,
        })
        for (const row of batch.rows) write(`${copyRow(row)}\n`)
        rows += batch.rows.length
        if (batch.rows.length < BATCH) break
      }
      await client.query("CLOSE backup_cursor")
      write("\\.\n\n")
    }

    const sequences = await client.query<{ schema: string; name: string; last_value: string | null }>({
      text: "SELECT schemaname AS schema, sequencename AS name, last_value FROM pg_sequences WHERE schemaname = 'public'",
      types: rawText,
    })
    write(
      dumpFooter(sequences.rows.map((s) => ({ name: { schema: s.schema, name: s.name }, lastValue: s.last_value })))
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    gzip.destroy()
    throw error
  } finally {
    await client.end().catch(() => {})
  }

  gzip.end()
  await finished
  return { takenAt, contractHash, body: Buffer.concat(chunks), tables: tables.length, rows }
}
