#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/490f0a52e29460c65326faa854170b4ed62587f83cfc97a0a4437594a7a26946/contract';
import endContract from '../../snapshots/490f0a52e29460c65326faa854170b4ed62587f83cfc97a0a4437594a7a26946/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/54199c2eacbd93e7eb3f1e995bb6f9818da8fef51fdad7882cda1ad4f875f5d5/contract';
import startContract from '../../snapshots/54199c2eacbd93e7eb3f1e995bb6f9818da8fef51fdad7882cda1ad4f875f5d5/contract.json' with { type: 'json' };
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
        table: 'Domain',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('hostname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isPrimary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lastCheckedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
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
          col('verification', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('verifiedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Domain_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Domain',
        index: 'Domain_hostname_key',
        columns: ['hostname'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Domain',
        index: 'Domain_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Domain',
        foreignKey: {
          name: 'Domain_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Domain' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
