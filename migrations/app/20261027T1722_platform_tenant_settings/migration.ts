#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract';
import endContract from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6f7f000593f23a45c57052b1caa9bf22a4d5af7ab62e730b64c8fb57093c5d31/contract';
import startContract from '../../snapshots/6f7f000593f23a45c57052b1caa9bf22a4d5af7ab62e730b64c8fb57093c5d31/contract.json' with { type: 'json' };
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
      this.dropIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_email_key',
      }),
      this.createTable({
        schema: 'public',
        table: 'TenantSetting',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['tenantId', 'key'], { name: 'TenantSetting_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserSetting',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['userId', 'key'], { name: 'UserSetting_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Member',
        column: col('status', 'text', {
          notNull: true,
          default: lit('active'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'NewsletterSubscriber',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_tenantId_email_key',
        columns: ['tenantId', 'email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantSetting',
        index: 'TenantSetting_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserSetting',
        index: 'UserSetting_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NewsletterSubscriber',
        foreignKey: {
          name: 'NewsletterSubscriber_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TenantSetting',
        foreignKey: {
          name: 'TenantSetting_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserSetting',
        foreignKey: {
          name: 'UserSetting_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
