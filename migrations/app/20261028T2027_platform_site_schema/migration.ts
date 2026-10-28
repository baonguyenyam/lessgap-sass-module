#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/54199c2eacbd93e7eb3f1e995bb6f9818da8fef51fdad7882cda1ad4f875f5d5/contract';
import endContract from '../../snapshots/54199c2eacbd93e7eb3f1e995bb6f9818da8fef51fdad7882cda1ad4f875f5d5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8c99af7f60019a92483c3f208895037e02b27a7de263b79a36b9507526c4e23d/contract';
import startContract from '../../snapshots/8c99af7f60019a92483c3f208895037e02b27a7de263b79a36b9507526c4e23d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
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
        table: 'Media',
        columns: [
          col('alt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('bytes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('height', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('width', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Media_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Page',
        columns: [
          col('content', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('published'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Page_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Site',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('languages', 'json', {
            notNull: true,
            default: lit(['en']),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('publishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('sections', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('themeKey', 'text', {
            notNull: true,
            default: lit('main'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokens', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'Site_pkey' }),
          checkExpression(
            'Site_status_check_24b93680',
            sql`"status" IN ('DRAFT', 'PUBLISHED', 'MAINTENANCE')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'SiteSettings',
        columns: [
          col('appearance', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('hours', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('profile', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'SiteSettings_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Media',
        index: 'Media_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Media',
        index: 'Media_tenantId_key_key',
        columns: ['tenantId', 'key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Page',
        index: 'Page_tenantId_key_key',
        columns: ['tenantId', 'key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Site',
        index: 'Site_tenantId_key',
        columns: ['tenantId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'SiteSettings',
        index: 'SiteSettings_tenantId_key',
        columns: ['tenantId'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Media',
        foreignKey: {
          name: 'Media_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Page',
        foreignKey: {
          name: 'Page_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Site',
        foreignKey: {
          name: 'Site_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SiteSettings',
        foreignKey: {
          name: 'SiteSettings_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Media' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Page' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Site' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SiteSettings' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
