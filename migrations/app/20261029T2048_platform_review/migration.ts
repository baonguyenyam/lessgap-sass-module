#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a1f89116d98e2693b2a090f7b823d71dd0b951be76bce02aa1ba771dcb54366/contract';
import endContract from '../../snapshots/3a1f89116d98e2693b2a090f7b823d71dd0b951be76bce02aa1ba771dcb54366/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fd706e17e65f164f410f3c846447ae89619040423ed7ece8ff2f6328f966685c/contract';
import startContract from '../../snapshots/fd706e17e65f164f410f3c846447ae89619040423ed7ece8ff2f6328f966685c/contract.json' with { type: 'json' };
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
        table: 'Review',
        columns: [
          col('appointmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rating', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Review_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Review',
        constraint: 'Review_appointmentId_key',
        columns: ['appointmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Review',
        index: 'Review_tenantStatus_idx',
        columns: ['tenantId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_appointmentId_fkey',
          columns: ['appointmentId'],
          references: { schema: 'public', table: 'Appointment', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Review',
        foreignKey: {
          name: 'Review_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Review' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
