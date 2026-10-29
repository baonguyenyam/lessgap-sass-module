#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1b46c0536ccb09069f977f41afb953dbda65fc88964a49b459b4bf92cf793bec/contract';
import startContract from '../../snapshots/1b46c0536ccb09069f977f41afb953dbda65fc88964a49b459b4bf92cf793bec/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fd706e17e65f164f410f3c846447ae89619040423ed7ece8ff2f6328f966685c/contract';
import endContract from '../../snapshots/fd706e17e65f164f410f3c846447ae89619040423ed7ece8ff2f6328f966685c/contract.json' with { type: 'json' };
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
        table: 'WaitlistEntry',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('manageToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serviceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('waiting'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('wantedDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'WaitlistEntry_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WaitlistEntry',
        index: 'WaitlistEntry_serviceId_idx_b5d9acbf',
        columns: ['serviceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WaitlistEntry',
        index: 'WaitlistEntry_tenantDate_idx',
        columns: ['tenantId', 'wantedDate', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WaitlistEntry',
        index: 'WaitlistEntry_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WaitlistEntry',
        foreignKey: {
          name: 'WaitlistEntry_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WaitlistEntry',
        foreignKey: {
          name: 'WaitlistEntry_serviceId_fkey',
          columns: ['serviceId'],
          references: { schema: 'public', table: 'Service', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'WaitlistEntry' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'WaitlistEntry',
        policy: {
          naming: { kind: 'wire', prefix: 'waitlist_entry_isolation', hash: 'c516f4ff' },
          tableName: 'WaitlistEntry',
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
