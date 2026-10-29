#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a5aea16fd0b8c87b1f0ab50693eadaf894257bfbcd10c3692ddf3721c46020a3/contract';
import endContract from '../../snapshots/a5aea16fd0b8c87b1f0ab50693eadaf894257bfbcd10c3692ddf3721c46020a3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cc5471f9c3edd9617c076bef7278bef74dddfae3193b78cf4e80852b88bebb5e/contract';
import startContract from '../../snapshots/cc5471f9c3edd9617c076bef7278bef74dddfae3193b78cf4e80852b88bebb5e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Location',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Location_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Appointment',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'AvailabilityRule',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StaffMember',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TimeOff',
        column: col('locationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Location',
        index: 'Location_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Location',
        foreignKey: {
          name: 'Location_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Location' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'Location',
        policy: {
          naming: { kind: 'wire', prefix: 'location_isolation', hash: 'c516f4ff' },
          tableName: 'Location',
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
