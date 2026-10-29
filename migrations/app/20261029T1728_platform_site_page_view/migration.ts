#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1b46c0536ccb09069f977f41afb953dbda65fc88964a49b459b4bf92cf793bec/contract';
import endContract from '../../snapshots/1b46c0536ccb09069f977f41afb953dbda65fc88964a49b459b4bf92cf793bec/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ca7d656ada716165ba7ca4a931b65571b72018fc2a9257c7390c905935a47ca3/contract';
import startContract from '../../snapshots/ca7d656ada716165ba7ca4a931b65571b72018fc2a9257c7390c905935a47ca3/contract.json' with { type: 'json' };
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
        table: 'SitePageView',
        columns: [
          col('count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('date', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('path', 'text', {
            notNull: true,
            default: lit('/'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'SitePageView_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SitePageView',
        index: 'SitePageView_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SitePageView',
        index: 'SitePageView_tenantId_path_date_key',
        columns: ['tenantId', 'path', 'date'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SitePageView',
        foreignKey: {
          name: 'SitePageView_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SitePageView' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'SitePageView',
        policy: {
          naming: { kind: 'wire', prefix: 'site_page_view_isolation', hash: 'c516f4ff' },
          tableName: 'SitePageView',
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
