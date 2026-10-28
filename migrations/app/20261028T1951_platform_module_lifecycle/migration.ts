#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/be83488f234d67800c42f71a1b3f2b948fc5286751d4655057a6d0a872211c52/contract';
import endContract from '../../snapshots/be83488f234d67800c42f71a1b3f2b948fc5286751d4655057a6d0a872211c52/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e783cff1bc4fdfbefa763aacf334641be18a56caf96a874e96a39b3a2e39157f/contract';
import startContract from '../../snapshots/e783cff1bc4fdfbefa763aacf334641be18a56caf96a874e96a39b3a2e39157f/contract.json' with { type: 'json' };
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
        table: 'ModuleExport',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('files', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('moduleKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ModuleExport_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ModulePurge',
        columns: [
          col('canceledAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('counts', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('moduleKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('runAfter', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('scheduled'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ModulePurge_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ModuleExport',
        index: 'ModuleExport_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ModulePurge',
        index: 'ModulePurge_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ModulePurge',
        index: 'ModulePurge_tenantId_moduleKey_idx',
        columns: ['tenantId', 'moduleKey'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ModuleExport',
        foreignKey: {
          name: 'ModuleExport_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ModulePurge',
        foreignKey: {
          name: 'ModulePurge_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
