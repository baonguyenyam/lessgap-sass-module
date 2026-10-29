#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/64f6f33d3169d45439706f6ed2f56db2f9f8b97444d2c7c0a8c0dee5ea6a3fec/contract';
import startContract from '../../snapshots/64f6f33d3169d45439706f6ed2f56db2f9f8b97444d2c7c0a8c0dee5ea6a3fec/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/eae0f2648e7a4f9867cebfc77f0def0324e49876dce0d1896ee7f7d0dc0f661d/contract';
import endContract from '../../snapshots/eae0f2648e7a4f9867cebfc77f0def0324e49876dce0d1896ee7f7d0dc0f661d/contract.json' with { type: 'json' };
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
        table: 'CustomerMembership',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('membershipId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'CustomerMembership_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'CustomerPackage',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('packageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionsLeft', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'CustomerPackage_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Membership',
        columns: [
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priceCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Membership_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'MembershipLedger',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deltaCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('holdingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'MembershipLedger_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Package',
        columns: [
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priceCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sessions', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Package_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PackageLedger',
        columns: [
          col('appointmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deltaSessions', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('holdingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PackageLedger_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerMembership',
        index: 'CustomerMembership_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerMembership',
        index: 'CustomerMembership_membershipId_idx_fdcfb7b5',
        columns: ['membershipId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerMembership',
        index: 'CustomerMembership_tenantCustomer_idx',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerMembership',
        index: 'CustomerMembership_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerPackage',
        index: 'CustomerPackage_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerPackage',
        index: 'CustomerPackage_packageId_idx_51f866f4',
        columns: ['packageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerPackage',
        index: 'CustomerPackage_tenantCustomer_idx',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerPackage',
        index: 'CustomerPackage_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Membership',
        index: 'Membership_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MembershipLedger',
        index: 'MembershipLedger_holdingId_idx',
        columns: ['holdingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MembershipLedger',
        index: 'MembershipLedger_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Package',
        index: 'Package_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PackageLedger',
        index: 'PackageLedger_holdingId_idx',
        columns: ['holdingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PackageLedger',
        index: 'PackageLedger_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerMembership',
        foreignKey: {
          name: 'CustomerMembership_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerMembership',
        foreignKey: {
          name: 'CustomerMembership_membershipId_fkey',
          columns: ['membershipId'],
          references: { schema: 'public', table: 'Membership', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerMembership',
        foreignKey: {
          name: 'CustomerMembership_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerPackage',
        foreignKey: {
          name: 'CustomerPackage_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerPackage',
        foreignKey: {
          name: 'CustomerPackage_packageId_fkey',
          columns: ['packageId'],
          references: { schema: 'public', table: 'Package', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerPackage',
        foreignKey: {
          name: 'CustomerPackage_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Membership',
        foreignKey: {
          name: 'Membership_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MembershipLedger',
        foreignKey: {
          name: 'MembershipLedger_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MembershipLedger',
        foreignKey: {
          name: 'MembershipLedger_holdingId_fkey',
          columns: ['holdingId'],
          references: { schema: 'public', table: 'CustomerMembership', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Package',
        foreignKey: {
          name: 'Package_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PackageLedger',
        foreignKey: {
          name: 'PackageLedger_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PackageLedger',
        foreignKey: {
          name: 'PackageLedger_holdingId_fkey',
          columns: ['holdingId'],
          references: { schema: 'public', table: 'CustomerPackage', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'CustomerMembership' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'CustomerPackage' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Membership' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'MembershipLedger' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Package' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PackageLedger' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'CustomerMembership',
        policy: {
          naming: { kind: 'wire', prefix: 'customer_membership_isolation', hash: 'c516f4ff' },
          tableName: 'CustomerMembership',
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
        table: 'CustomerPackage',
        policy: {
          naming: { kind: 'wire', prefix: 'customer_package_isolation', hash: 'c516f4ff' },
          tableName: 'CustomerPackage',
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
        table: 'Membership',
        policy: {
          naming: { kind: 'wire', prefix: 'membership_isolation', hash: 'c516f4ff' },
          tableName: 'Membership',
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
        table: 'MembershipLedger',
        policy: {
          naming: { kind: 'wire', prefix: 'membership_ledger_isolation', hash: 'c516f4ff' },
          tableName: 'MembershipLedger',
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
        table: 'Package',
        policy: {
          naming: { kind: 'wire', prefix: 'package_isolation', hash: 'c516f4ff' },
          tableName: 'Package',
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
        table: 'PackageLedger',
        policy: {
          naming: { kind: 'wire', prefix: 'package_ledger_isolation', hash: 'c516f4ff' },
          tableName: 'PackageLedger',
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
