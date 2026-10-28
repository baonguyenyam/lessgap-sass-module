#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/79c32f893fd0351a810ad8b9c40b6ed3d263f58e6fd0560db7ffdc884de250b7/contract';
import startContract from '../../snapshots/79c32f893fd0351a810ad8b9c40b6ed3d263f58e6fd0560db7ffdc884de250b7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d927132041fdd4862a0a32a8c3ff5253e06d5165b4dfe61d3e7ee9f650483a2e/contract';
import endContract from '../../snapshots/d927132041fdd4862a0a32a8c3ff5253e06d5165b4dfe61d3e7ee9f650483a2e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorKind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('data', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AuditLog_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_tenantId_createdAt_idx',
        columns: ['tenantId', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
