#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0c841be9954d48a5fd4fb5444ad1f301dd2683a64814313616704d87d02d9a2d/contract';
import endContract from '../../snapshots/0c841be9954d48a5fd4fb5444ad1f301dd2683a64814313616704d87d02d9a2d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ab2607837ca3043312ac0439cc44c53067820888cddb41048f4633572ffaa8a7/contract';
import startContract from '../../snapshots/ab2607837ca3043312ac0439cc44c53067820888cddb41048f4633572ffaa8a7/contract.json' with { type: 'json' };
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
        table: 'Quote',
        columns: [
          col('accessToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('usd'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('customerEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('depositCents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('terms', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('totalCents', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('validUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Quote_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'QuoteEvent',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('dataJson', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'QuoteEvent_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'QuoteLine',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('quoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitPriceCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'QuoteLine_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'QuoteRequest',
        columns: [
          col('answersJson', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('new'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'QuoteRequest_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Quote',
        constraint: 'Quote_accessToken_key',
        columns: ['accessToken'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_requestId_idx_fd667f92',
        columns: ['requestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteEvent',
        index: 'QuoteEvent_quoteId_idx',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteEvent',
        index: 'QuoteEvent_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteLine',
        index: 'QuoteLine_quoteId_idx',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteLine',
        index: 'QuoteLine_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteRequest',
        index: 'QuoteRequest_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_requestId_fkey',
          columns: ['requestId'],
          references: { schema: 'public', table: 'QuoteRequest', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteEvent',
        foreignKey: {
          name: 'QuoteEvent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteEvent',
        foreignKey: {
          name: 'QuoteEvent_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteLine',
        foreignKey: {
          name: 'QuoteLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteLine',
        foreignKey: {
          name: 'QuoteLine_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteRequest',
        foreignKey: {
          name: 'QuoteRequest_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Quote' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'QuoteEvent' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'QuoteLine' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'QuoteRequest' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
