#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/380db2a5812355eca8175dd24a64a1cff5f2e49d0b34ac36ad06b14704761259/contract';
import startContract from '../../snapshots/380db2a5812355eca8175dd24a64a1cff5f2e49d0b34ac36ad06b14704761259/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/79c32f893fd0351a810ad8b9c40b6ed3d263f58e6fd0560db7ffdc884de250b7/contract';
import endContract from '../../snapshots/79c32f893fd0351a810ad8b9c40b6ed3d263f58e6fd0560db7ffdc884de250b7/contract.json' with { type: 'json' };
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
        table: 'TenantModule',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('disabledAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('enabledAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('firstEnabledAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('moduleKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'TenantModule_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantModule',
        index: 'TenantModule_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantModule',
        index: 'TenantModule_tenantId_moduleKey_key',
        columns: ['tenantId', 'moduleKey'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TenantModule',
        foreignKey: {
          name: 'TenantModule_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'TenantModule' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'TenantModule',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_module_isolation', hash: 'c516f4ff' },
          tableName: 'TenantModule',
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
