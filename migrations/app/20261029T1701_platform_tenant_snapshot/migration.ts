#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ca7d656ada716165ba7ca4a931b65571b72018fc2a9257c7390c905935a47ca3/contract';
import endContract from '../../snapshots/ca7d656ada716165ba7ca4a931b65571b72018fc2a9257c7390c905935a47ca3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f2ad8164887818bf08456ffe4efec064f341c452ce2aebdc128ab643f16f6db9/contract';
import startContract from '../../snapshots/f2ad8164887818bf08456ffe4efec064f341c452ce2aebdc128ab643f16f6db9/contract.json' with { type: 'json' };
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
        table: 'TenantSnapshot',
        columns: [
          col('completedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('r2Key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('rowCounts', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('sizeBytes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('running'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'TenantSnapshot_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantSnapshot',
        index: 'TenantSnapshot_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TenantSnapshot',
        foreignKey: {
          name: 'TenantSnapshot_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'TenantSnapshot' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'TenantSnapshot',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_snapshot_isolation', hash: 'c516f4ff' },
          tableName: 'TenantSnapshot',
          namespaceId: 'public',
          operation: 'all',
          roles: [],
          using: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          withCheck: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          permissive: true,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
