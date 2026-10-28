#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/368c0f832bf717aae07a211a316faa92e5b72946f90895162a8e58bbaa1a0def/contract';
import startContract from '../../snapshots/368c0f832bf717aae07a211a316faa92e5b72946f90895162a8e58bbaa1a0def/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c08b36563264571a863a535b9c306ad9c0305559b75497eb2ba95c132bc40e2b/contract';
import endContract from '../../snapshots/c08b36563264571a863a535b9c306ad9c0305559b75497eb2ba95c132bc40e2b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

const { sql: db, raw, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PlanVisibility',
        members: ['PUBLIC', 'UNLISTED', 'ARCHIVED'],
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Purchase',
        constraint: 'Purchase_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Subscription',
        constraint: 'Subscription_userId_fkey',
        kind: 'foreignKey',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Plan',
        constraint: 'Plan_features_elem_not_null_1a661718',
      }),
      // Re-own billing to the tenant (phase 2, task 2.1): fill tenantId from
      // the user's own tenant — their owner membership — before userId goes.
      this.addColumn({
        schema: 'public',
        table: 'Purchase',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Subscription',
        column: col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-purchase-tenant', {
        backfillsColumn: { schema: 'public', table: 'Purchase', column: 'tenantId' },
        check: () =>
          raw.sql`SELECT "id" FROM "Purchase" WHERE "tenantId" IS NULL LIMIT 1`
            .returnsRow({ id: "pg/text@1" })
            .build(),
        run: () =>
          raw.sql`UPDATE "Purchase" p SET "tenantId" = (SELECT m."organizationId" FROM "Member" m WHERE m."userId" = p."userId" AND m."role" = 'owner' ORDER BY m."createdAt" ASC LIMIT 1) WHERE p."tenantId" IS NULL`
            .affectedCount()
            .build(),
      }),
      this.dataTransform(contract, 'backfill-subscription-tenant', {
        backfillsColumn: { schema: 'public', table: 'Subscription', column: 'tenantId' },
        check: () =>
          raw.sql`SELECT "id" FROM "Subscription" WHERE "tenantId" IS NULL LIMIT 1`
            .returnsRow({ id: "pg/text@1" })
            .build(),
        run: () =>
          raw.sql`UPDATE "Subscription" s SET "tenantId" = (SELECT m."organizationId" FROM "Member" m WHERE m."userId" = s."userId" AND m."role" = 'owner' ORDER BY m."createdAt" ASC LIMIT 1) WHERE s."tenantId" IS NULL`
            .affectedCount()
            .build(),
      }),
      this.dropIndex({ schema: 'public', table: 'Purchase', index: 'Purchase_userId_idx' }),
      this.dropColumn({ schema: 'public', table: 'Purchase', column: 'userId' }),
      this.dropIndex({ schema: 'public', table: 'Subscription', index: 'Subscription_userId_key' }),
      this.dropColumn({ schema: 'public', table: 'Subscription', column: 'userId' }),
      this.setNotNull({ schema: 'public', table: 'Purchase', column: 'tenantId' }),
      this.setNotNull({ schema: 'public', table: 'Subscription', column: 'tenantId' }),
      this.createTable({
        schema: 'public',
        table: 'AddOn',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('features', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('stripePriceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'AddOn_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'EntitlementOverride',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('featureKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ignoresSwitch', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'EntitlementOverride_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'TenantAddOn',
        columns: [
          col('addOnId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'TenantAddOn_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'UsageCounter',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('limitKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('periodStart', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('used', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'UsageCounter_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Plan',
        column: col('feeModel', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Plan',
        column: col('marketingFeatures', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Plan',
        column: col('setupFeeCents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Plan',
        column: col('visibility', '"PlanVisibility"', {
          notNull: true,
          default: lit('PUBLIC'),
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PlanVisibility' } },
        }),
      }),
      // The old `features` text[] is the marketing bullet list — copy it into
      // `marketingFeatures`, then reset `features` to the empty feature map.
      this.dataTransform(contract, 'copy-plan-marketing-features', {
        backfillsColumn: { schema: 'public', table: 'Plan', column: 'marketingFeatures' },
        check: () =>
          raw.sql`SELECT "id" FROM "Plan" WHERE "marketingFeatures" = '{}' AND "features" <> '{}' LIMIT 1`
            .returnsRow({ id: "pg/text@1" })
            .build(),
        run: () => raw.sql`UPDATE "Plan" SET "marketingFeatures" = "features"`.affectedCount().build(),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'Plan',
        column: 'features',
        type: 'json',
        using: sql`'{}'::json`,
      }),
      this.setDefault({
        schema: 'public',
        table: 'Plan',
        column: col('features', 'json', { default: lit({}), codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Plan', column: 'stripePriceId' }),
      // tenantId was added as nullable, backfilled from the user's owner
      // membership and made NOT NULL above — nothing left to add here.
      this.addCheckConstraint({
        schema: 'public',
        table: 'Plan',
        constraint: 'Plan_marketingFeatures_elem_not_null_4825684d',
        expression: sql`array_position("marketingFeatures", NULL) IS NULL`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'AddOn',
        index: 'AddOn_key_key',
        columns: ['key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'AddOn',
        index: 'AddOn_stripePriceId_key',
        columns: ['stripePriceId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'EntitlementOverride',
        index: 'EntitlementOverride_tenantId_featureKey_key',
        columns: ['tenantId', 'featureKey'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'EntitlementOverride',
        index: 'EntitlementOverride_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'Purchase_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Subscription',
        index: 'Subscription_tenantId_key',
        columns: ['tenantId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantAddOn',
        index: 'TenantAddOn_addOnId_idx_84096c82',
        columns: ['addOnId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantAddOn',
        index: 'TenantAddOn_tenantId_addOnId_key',
        columns: ['tenantId', 'addOnId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantAddOn',
        index: 'TenantAddOn_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UsageCounter',
        index: 'UsageCounter_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UsageCounter',
        index: 'UsageCounter_tenantId_limitKey_periodStart_key',
        columns: ['tenantId', 'limitKey', 'periodStart'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EntitlementOverride',
        foreignKey: {
          name: 'EntitlementOverride_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Subscription',
        foreignKey: {
          name: 'Subscription_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TenantAddOn',
        foreignKey: {
          name: 'TenantAddOn_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TenantAddOn',
        foreignKey: {
          name: 'TenantAddOn_addOnId_fkey',
          columns: ['addOnId'],
          references: { schema: 'public', table: 'AddOn', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UsageCounter',
        foreignKey: {
          name: 'UsageCounter_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'EntitlementOverride' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Purchase' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Subscription' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'TenantAddOn' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'UsageCounter' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
