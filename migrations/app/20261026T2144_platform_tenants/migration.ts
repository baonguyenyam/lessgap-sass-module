#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/261486cc3557069867398d8541b07c6ad27d09f8fb5df1f59384290842d32081/contract';
import startContract from '../../snapshots/261486cc3557069867398d8541b07c6ad27d09f8fb5df1f59384290842d32081/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4e0598a39b7e69afc5db6061cedcf87a754371b45ad0dc65cd5bee8d91139fce/contract';
import endContract from '../../snapshots/4e0598a39b7e69afc5db6061cedcf87a754371b45ad0dc65cd5bee8d91139fce/contract.json' with { type: 'json' };
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
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PlatformRole',
        members: ['OWNER', 'ADMIN', 'SUPPORT', 'DESIGNER'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'TenantStatus',
        members: ['PROVISIONING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Invitation',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inviterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('teamId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Invitation_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Member',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Member_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrganizationRole',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permission', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'OrganizationRole_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Tenant',
        columns: [
          col('chargesEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
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
          col('defaultLanguage', 'text', {
            notNull: true,
            default: lit('en'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('logo', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"TenantStatus"', {
            notNull: true,
            default: lit('PROVISIONING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'TenantStatus' } },
          }),
          col('stripeAccountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stripeCustomerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('timeZone', 'text', {
            notNull: true,
            default: lit('America/Chicago'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('verticalKey', 'text', {
            notNull: true,
            default: lit('generic'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Tenant_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('platformRole', '"PlatformRole"', {
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PlatformRole' } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invitation',
        index: 'Invitation_email_idx',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invitation',
        index: 'Invitation_inviterId_idx_c2d8c6d6',
        columns: ['inviterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invitation',
        index: 'Invitation_organizationId_email_key',
        columns: ['organizationId', 'email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invitation',
        index: 'Invitation_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Member',
        index: 'Member_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Member',
        index: 'Member_organizationId_userId_key',
        columns: ['organizationId', 'userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Member',
        index: 'Member_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrganizationRole',
        index: 'OrganizationRole_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrganizationRole',
        index: 'OrganizationRole_organizationId_role_key',
        columns: ['organizationId', 'role'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Tenant',
        index: 'Tenant_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Tenant',
        index: 'Tenant_stripeAccountId_key',
        columns: ['stripeAccountId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Tenant',
        index: 'Tenant_stripeCustomerId_key',
        columns: ['stripeCustomerId'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invitation',
        foreignKey: {
          name: 'Invitation_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invitation',
        foreignKey: {
          name: 'Invitation_inviterId_fkey',
          columns: ['inviterId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrganizationRole',
        foreignKey: {
          name: 'OrganizationRole_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
