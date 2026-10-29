#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/27d182806550c6bb5a79b7bf9b157de4132b906dff71bd3dd1f127788c5af306/contract';
import startContract from '../../snapshots/27d182806550c6bb5a79b7bf9b157de4132b906dff71bd3dd1f127788c5af306/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/34f15eb65e525bbddaac943d73971524dffd8887e35050f30b07b78d16c237c4/contract';
import endContract from '../../snapshots/34f15eb65e525bbddaac943d73971524dffd8887e35050f30b07b78d16c237c4/contract.json' with { type: 'json' };
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
        table: 'Reservation',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('partySize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startTs', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('confirmed'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tableId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Reservation_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ReservationRule',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('endMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxPartySize', 'int4', {
            notNull: true,
            default: lit(12),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('minPartySize', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('slotMinutes', 'int4', {
            notNull: true,
            default: lit(90),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('startMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('turnMinutes', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('weekday', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ReservationRule_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Table',
        columns: [
          col('area', 'text', {
            notNull: true,
            default: lit('main'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('capacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Table_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Reservation',
        index: 'Reservation_tableId_idx_f5c39e5c',
        columns: ['tableId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Reservation',
        index: 'Reservation_tableId_startTs_idx',
        columns: ['tableId', 'startTs'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Reservation',
        index: 'Reservation_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReservationRule',
        index: 'ReservationRule_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Table',
        index: 'Table_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Reservation',
        foreignKey: {
          name: 'Reservation_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Reservation',
        foreignKey: {
          name: 'Reservation_tableId_fkey',
          columns: ['tableId'],
          references: { schema: 'public', table: 'Table', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReservationRule',
        foreignKey: {
          name: 'ReservationRule_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Table',
        foreignKey: {
          name: 'Table_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Reservation' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ReservationRule' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Table' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
