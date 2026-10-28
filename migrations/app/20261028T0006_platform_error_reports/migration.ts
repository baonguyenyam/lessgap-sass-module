#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract';
import startContract from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/30f14e0651daa25408ef25150422756ade5dd16e0462ad2b0edf28e19c6395cc/contract';
import endContract from '../../snapshots/30f14e0651daa25408ef25150422756ade5dd16e0462ad2b0edf28e19c6395cc/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ErrorReport',
        columns: [
          col('count', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('digest', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstSeenAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastSeenAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ErrorReport_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ErrorReport',
        index: 'ErrorReport_digest_key',
        columns: ['digest'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ErrorReport',
        index: 'ErrorReport_lastSeenAt_idx',
        columns: ['lastSeenAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
