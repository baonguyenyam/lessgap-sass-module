#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3a1f89116d98e2693b2a090f7b823d71dd0b951be76bce02aa1ba771dcb54366/contract';
import startContract from '../../snapshots/3a1f89116d98e2693b2a090f7b823d71dd0b951be76bce02aa1ba771dcb54366/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/64f6f33d3169d45439706f6ed2f56db2f9f8b97444d2c7c0a8c0dee5ea6a3fec/contract';
import endContract from '../../snapshots/64f6f33d3169d45439706f6ed2f56db2f9f8b97444d2c7c0a8c0dee5ea6a3fec/contract.json' with { type: 'json' };
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
        table: 'GiftCard',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('balanceCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('buyerEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('buyerName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('stripeCheckoutSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'GiftCard_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'GiftCardLedger',
        columns: [
          col('appointmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('cardId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deltaCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'GiftCardLedger_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GiftCard',
        index: 'GiftCard_tenantCode_idx',
        columns: ['tenantId', 'code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'GiftCard',
        index: 'GiftCard_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GiftCardLedger',
        index: 'GiftCardLedger_cardId_idx',
        columns: ['cardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GiftCardLedger',
        index: 'GiftCardLedger_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GiftCard',
        foreignKey: {
          name: 'GiftCard_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GiftCardLedger',
        foreignKey: {
          name: 'GiftCardLedger_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GiftCardLedger',
        foreignKey: {
          name: 'GiftCardLedger_cardId_fkey',
          columns: ['cardId'],
          references: { schema: 'public', table: 'GiftCard', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'GiftCard' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'GiftCardLedger' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'GiftCard',
        policy: {
          naming: { kind: 'wire', prefix: 'gift_card_isolation', hash: 'c516f4ff' },
          tableName: 'GiftCard',
          namespaceId: 'public',
          operation: 'all',
          roles: [],
          using: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          withCheck: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'GiftCardLedger',
        policy: {
          naming: { kind: 'wire', prefix: 'gift_card_ledger_isolation', hash: 'c516f4ff' },
          tableName: 'GiftCardLedger',
          namespaceId: 'public',
          operation: 'all',
          roles: [],
          using: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          withCheck: sql`"tenantId" = current_setting('app.tenant_id', true)`,
          permissive: true,
        },
      }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'Review',
        policy: {
          naming: { kind: 'wire', prefix: 'review_isolation', hash: 'c516f4ff' },
          tableName: 'Review',
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
