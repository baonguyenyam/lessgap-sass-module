#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a0b9ee191fc3e0f0964eea42712653d2c2ff05160d99f29d9c35176fc34f739/contract';
import endContract from '../../snapshots/3a0b9ee191fc3e0f0964eea42712653d2c2ff05160d99f29d9c35176fc34f739/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a5aea16fd0b8c87b1f0ab50693eadaf894257bfbcd10c3692ddf3721c46020a3/contract';
import startContract from '../../snapshots/a5aea16fd0b8c87b1f0ab50693eadaf894257bfbcd10c3692ddf3721c46020a3/contract.json' with { type: 'json' };
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
        table: 'IntakeForm',
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
          col('fields', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'IntakeForm_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'IntakeResponse',
        columns: [
          col('answers', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('appointmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('formId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'IntakeResponse_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IntakeForm',
        index: 'IntakeForm_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IntakeResponse',
        index: 'IntakeResponse_appointmentId_idx',
        columns: ['appointmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IntakeResponse',
        index: 'IntakeResponse_formId_idx',
        columns: ['formId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IntakeResponse',
        index: 'IntakeResponse_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IntakeForm',
        foreignKey: {
          name: 'IntakeForm_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IntakeResponse',
        foreignKey: {
          name: 'IntakeResponse_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IntakeResponse',
        foreignKey: {
          name: 'IntakeResponse_formId_fkey',
          columns: ['formId'],
          references: { schema: 'public', table: 'IntakeForm', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'IntakeForm' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'IntakeResponse' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'IntakeForm',
        policy: {
          naming: { kind: 'wire', prefix: 'intake_form_isolation', hash: 'c516f4ff' },
          tableName: 'IntakeForm',
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
        table: 'IntakeResponse',
        policy: {
          naming: { kind: 'wire', prefix: 'intake_response_isolation', hash: 'c516f4ff' },
          tableName: 'IntakeResponse',
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
