/**
 * The pure parts of a database backup (spec/adr/0023): how a value is written
 * in a COPY block, in which order the tables are written, and the name and
 * header of the file. The parts that talk to Postgres and R2 are in
 * `backup.ts`.
 *
 * The file is plain SQL that `psql` replays into a database already migrated to
 * the same contract: one `COPY … FROM stdin` block per table, parents before
 * the tables whose foreign keys point at them, then the sequence positions.
 */

export type TableRef = { schema: string; name: string }
export type ForeignKey = { from: TableRef; to: TableRef }

/** `"schema"."table"`, quoted for SQL. */
export function qualifiedName(table: TableRef): string {
  return `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`
}

/** A double-quoted SQL identifier. */
export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

/**
 * One value in COPY's text format: `\N` for null, and backslash, tab, newline
 * and carriage return escaped, as Postgres itself writes them.
 */
export function copyValue(value: string | null): string {
  if (value === null) return "\\N"
  return value.replaceAll("\\", "\\\\").replaceAll("\t", "\\t").replaceAll("\n", "\\n").replaceAll("\r", "\\r")
}

/** One row of a COPY block, without its newline. */
export function copyRow(values: readonly (string | null)[]): string {
  return values.map(copyValue).join("\t")
}

/** The line that opens a table's COPY block. */
export function copyHeader(table: TableRef, columns: readonly string[]): string {
  return `COPY ${qualifiedName(table)} (${columns.map(quoteIdent).join(", ")}) FROM stdin;`
}

/**
 * The tables in an order a restore can load them: every table after the tables
 * its foreign keys point to. A table that points to itself is fine (Postgres
 * checks those at the end of the COPY). Tables in a cycle, which a restore
 * could not order anyway, keep their alphabetical place at the end.
 */
export function loadOrder(tables: readonly TableRef[], foreignKeys: readonly ForeignKey[]): TableRef[] {
  const key = (t: TableRef) => `${t.schema}.${t.name}`
  const sorted = [...tables].sort((a, b) => key(a).localeCompare(key(b)))
  const known = new Set(sorted.map(key))
  const parents = new Map<string, Set<string>>(sorted.map((t) => [key(t), new Set<string>()]))
  for (const fk of foreignKeys) {
    const from = key(fk.from)
    const to = key(fk.to)
    if (from !== to && known.has(from) && known.has(to)) parents.get(from)!.add(to)
  }

  const out: TableRef[] = []
  const placed = new Set<string>()
  let progress = true
  while (progress) {
    progress = false
    for (const table of sorted) {
      const k = key(table)
      if (placed.has(k)) continue
      if ([...parents.get(k)!].every((p) => placed.has(p))) {
        out.push(table)
        placed.add(k)
        progress = true
      }
    }
  }
  for (const table of sorted) if (!placed.has(key(table))) out.push(table)
  return out
}

export const BACKUP_PREFIX = "platform-backups/"

/** `platform-backups/2026-10-27T19-50-07Z.sql.gz`: sortable, and safe in every storage key. */
export function backupKey(at: Date): string {
  const stamp = at
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(":", "-")
  return `${BACKUP_PREFIX}${stamp}.sql.gz`
}

/** When a backup was taken, read back from its key; null for a key this module did not write. */
export function backupTakenAt(key: string): Date | null {
  const match = /^platform-backups\/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.sql\.gz$/.exec(key)
  if (!match) return null
  const [, day, h, m, s] = match
  return new Date(`${day}T${h}:${m}:${s}Z`)
}

/** The comment block a backup file opens with: what it is and how to restore it. */
export function dumpHeader(info: { takenAt: Date; appVersion: string; contractHash: string | null }): string {
  return [
    "-- Database backup, data only (spec/adr/0023).",
    `-- Taken: ${info.takenAt.toISOString()}`,
    `-- App version: ${info.appVersion}`,
    `-- Contract hash: ${info.contractHash ?? "unknown"}`,
    "--",
    "-- Restore into an empty database migrated to the same contract hash:",
    '--   pnpm db:migrate, then gunzip -c this-file.sql.gz | psql "$DIRECT_URL" -v ON_ERROR_STOP=1',
    "",
    "SET client_encoding = 'UTF8';",
    "SET standard_conforming_strings = on;",
    "BEGIN;",
    "",
  ].join("\n")
}

/** The lines that close a backup: sequence positions, then the commit. */
export function dumpFooter(sequences: readonly { name: TableRef; lastValue: string | null }[]): string {
  const lines = sequences
    .filter((s) => s.lastValue !== null)
    .map((s) => `SELECT pg_catalog.setval('${qualifiedName(s.name).replaceAll("'", "''")}', ${s.lastValue}, true);`)
  return [...lines, "COMMIT;", ""].join("\n")
}
