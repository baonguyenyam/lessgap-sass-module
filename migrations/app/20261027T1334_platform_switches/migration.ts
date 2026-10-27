#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6f7f000593f23a45c57052b1caa9bf22a4d5af7ab62e730b64c8fb57093c5d31/contract';
import endContract from '../../snapshots/6f7f000593f23a45c57052b1caa9bf22a4d5af7ab62e730b64c8fb57093c5d31/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ebc4c2460e7cdc1032d5b4a73228cba406b394a3ad2e01f889ff24074f90b6a6/contract';
import startContract from '../../snapshots/ebc4c2460e7cdc1032d5b4a73228cba406b394a3ad2e01f889ff24074f90b6a6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PlatformSwitch',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['key'], { name: 'PlatformSwitch_pkey' })],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
