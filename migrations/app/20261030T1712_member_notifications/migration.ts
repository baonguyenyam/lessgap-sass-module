#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/00b73f1f528cf36de72a63ecdcc06381dd0e18804d485930075a3534fcf61950/contract';
import endContract from '../../snapshots/00b73f1f528cf36de72a63ecdcc06381dd0e18804d485930075a3534fcf61950/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/3a0b9ee191fc3e0f0964eea42712653d2c2ff05160d99f29d9c35176fc34f739/contract';
import startContract from '../../snapshots/3a0b9ee191fc3e0f0964eea42712653d2c2ff05160d99f29d9c35176fc34f739/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'MemberNotification',
        columns: [
          col('body', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('href', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'MemberNotification_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberNotification',
        index: 'MemberNotification_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberNotification',
        index: 'MemberNotification_tenant_user_idx',
        columns: ['tenantId', 'userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MemberNotification',
        foreignKey: {
          name: 'MemberNotification_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'MemberNotification' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
