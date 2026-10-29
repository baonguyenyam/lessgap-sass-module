#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cc5471f9c3edd9617c076bef7278bef74dddfae3193b78cf4e80852b88bebb5e/contract';
import endContract from '../../snapshots/cc5471f9c3edd9617c076bef7278bef74dddfae3193b78cf4e80852b88bebb5e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/eae0f2648e7a4f9867cebfc77f0def0324e49876dce0d1896ee7f7d0dc0f661d/contract';
import startContract from '../../snapshots/eae0f2648e7a4f9867cebfc77f0def0324e49876dce0d1896ee7f7d0dc0f661d/contract.json' with { type: 'json' };
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
        table: 'HealthCheck',
        columns: [
          col('checkedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('detail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('latencyMs', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ok'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'HealthCheck_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HealthCheck',
        index: 'HealthCheck_kindChecked_idx',
        columns: ['kind', 'checkedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
