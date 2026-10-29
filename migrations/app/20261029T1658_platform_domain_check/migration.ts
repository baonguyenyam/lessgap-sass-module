#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6b0e2b0a00fb3889a1c34ee1bb2ae5c2f6d51509ab92c6cc5a3e955f231f9edc/contract';
import startContract from '../../snapshots/6b0e2b0a00fb3889a1c34ee1bb2ae5c2f6d51509ab92c6cc5a3e955f231f9edc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f2ad8164887818bf08456ffe4efec064f341c452ce2aebdc128ab643f16f6db9/contract';
import endContract from '../../snapshots/f2ad8164887818bf08456ffe4efec064f341c452ce2aebdc128ab643f16f6db9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'DomainCheck',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('hostname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'DomainCheck_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DomainCheck',
        index: 'DomainCheck_runId_idx',
        columns: ['runId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
