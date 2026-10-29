#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/27d182806550c6bb5a79b7bf9b157de4132b906dff71bd3dd1f127788c5af306/contract';
import endContract from '../../snapshots/27d182806550c6bb5a79b7bf9b157de4132b906dff71bd3dd1f127788c5af306/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fbe31af42d7f7dc1ef9b38c780668a91c5f5239ea57a845ed0136c4f4c9eef77/contract';
import startContract from '../../snapshots/fbe31af42d7f7dc1ef9b38c780668a91c5f5239ea57a845ed0136c4f4c9eef77/contract.json' with { type: 'json' };
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
        table: 'Appointment',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('remindedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('resourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serviceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('site'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('requested'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Appointment_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AppointmentEvent',
        columns: [
          col('actor', 'text', {
            notNull: true,
            default: lit('system'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('appointmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AppointmentEvent_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'AvailabilityRule',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('endMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('weekday', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'AvailabilityRule_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Customer',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('language', 'text', {
            notNull: true,
            default: lit('en'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('marketingConsentAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('marketingConsentSource', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('smsConsentAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('smsConsentSource', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Customer_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'NotificationLog',
        columns: [
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('providerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recipient', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('queued'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('template', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'NotificationLog_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Resource',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('room'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Resource_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'TimeOff',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('endTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'TimeOff_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_serviceId_idx_b5d9acbf',
        columns: ['serviceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_staffId_startTs_idx',
        columns: ['staffId', 'startTs'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AppointmentEvent',
        index: 'AppointmentEvent_appointmentId_idx',
        columns: ['appointmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AppointmentEvent',
        index: 'AppointmentEvent_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AvailabilityRule',
        index: 'AvailabilityRule_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AvailabilityRule',
        index: 'AvailabilityRule_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AvailabilityRule',
        index: 'AvailabilityRule_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Customer',
        index: 'Customer_tenantId_email_idx',
        columns: ['tenantId', 'email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Customer',
        index: 'Customer_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'NotificationLog',
        index: 'NotificationLog_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeOff',
        index: 'TimeOff_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeOff',
        index: 'TimeOff_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeOff',
        index: 'TimeOff_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_serviceId_fkey',
          columns: ['serviceId'],
          references: { schema: 'public', table: 'Service', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'StaffMember', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AppointmentEvent',
        foreignKey: {
          name: 'AppointmentEvent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AppointmentEvent',
        foreignKey: {
          name: 'AppointmentEvent_appointmentId_fkey',
          columns: ['appointmentId'],
          references: { schema: 'public', table: 'Appointment', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AvailabilityRule',
        foreignKey: {
          name: 'AvailabilityRule_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AvailabilityRule',
        foreignKey: {
          name: 'AvailabilityRule_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'StaffMember', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AvailabilityRule',
        foreignKey: {
          name: 'AvailabilityRule_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Customer',
        foreignKey: {
          name: 'Customer_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NotificationLog',
        foreignKey: {
          name: 'NotificationLog_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Resource',
        foreignKey: {
          name: 'Resource_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeOff',
        foreignKey: {
          name: 'TimeOff_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeOff',
        foreignKey: {
          name: 'TimeOff_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'StaffMember', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeOff',
        foreignKey: {
          name: 'TimeOff_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Appointment' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'AppointmentEvent' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'AvailabilityRule' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Customer' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'NotificationLog' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Resource' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'TimeOff' }),
      // Decision 5-A (spec/07): the database refuses double bookings —
      // tsrange on the UTC timestamp columns is immutable; btree_gist lets
      // the staffId/resourceId text keys share the GiST index. These are
      // hand-written operations — the planner has no exclusion-constraint
      // op; the shape mirrors ops.json's SqlMigrationPlanOperation.
      {
        id: 'extension.btree_gist',
        label: 'Create extension btree_gist',
        summary: 'Creates the btree_gist extension for exclusion constraints',
        operationClass: 'additive' as const,
        target: { id: 'postgres', details: { schema: 'public', objectType: 'extension', name: 'btree_gist' } },
        precheck: [],
        execute: [{ description: 'create extension btree_gist', sql: 'CREATE EXTENSION IF NOT EXISTS btree_gist' }],
        postcheck: [],
      },
      {
        id: 'constraint.appointment_no_double_staff',
        label: 'Add exclusion constraint appointment_no_double_staff',
        summary: 'A staff member cannot hold two overlapping appointments',
        operationClass: 'additive' as const,
        target: { id: 'postgres', details: { schema: 'public', objectType: 'constraint', name: 'appointment_no_double_staff' } },
        precheck: [],
        execute: [{
          description: 'add exclusion constraint appointment_no_double_staff',
          sql: `ALTER TABLE "public"."Appointment" ADD CONSTRAINT "appointment_no_double_staff" EXCLUDE USING gist ("staffId" WITH =, tsrange("startTs", "endTs") WITH &&) WHERE (status <> 'canceled')`,
        }],
        postcheck: [],
      },
      {
        id: 'constraint.appointment_no_double_resource',
        label: 'Add exclusion constraint appointment_no_double_resource',
        summary: 'A resource cannot hold two overlapping appointments',
        operationClass: 'additive' as const,
        target: { id: 'postgres', details: { schema: 'public', objectType: 'constraint', name: 'appointment_no_double_resource' } },
        precheck: [],
        execute: [{
          description: 'add exclusion constraint appointment_no_double_resource',
          sql: `ALTER TABLE "public"."Appointment" ADD CONSTRAINT "appointment_no_double_resource" EXCLUDE USING gist ("resourceId" WITH =, tsrange("startTs", "endTs") WITH &&) WHERE (status <> 'canceled' AND "resourceId" IS NOT NULL)`,
        }],
        postcheck: [],
      },
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
