#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ab2607837ca3043312ac0439cc44c53067820888cddb41048f4633572ffaa8a7/contract';
import endContract from '../../snapshots/ab2607837ca3043312ac0439cc44c53067820888cddb41048f4633572ffaa8a7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c8684463d129eac44203cec5bab1150cb3a279bdc185741a4e1c80eec5e2da15/contract';
import startContract from '../../snapshots/c8684463d129eac44203cec5bab1150cb3a279bdc185741a4e1c80eec5e2da15/contract.json' with { type: 'json' };
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
        table: 'ProductModifier',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('groupId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('priceCents', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ProductModifier_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProductModifierGroup',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxSelections', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('minSelections', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ProductModifierGroup_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'OrderLine',
        column: col('modifiers', 'json', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/json@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductModifier',
        index: 'ProductModifier_groupId_idx',
        columns: ['groupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductModifier',
        index: 'ProductModifier_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductModifierGroup',
        index: 'ProductModifierGroup_productId_idx',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductModifierGroup',
        index: 'ProductModifierGroup_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductModifier',
        foreignKey: {
          name: 'ProductModifier_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductModifier',
        foreignKey: {
          name: 'ProductModifier_groupId_fkey',
          columns: ['groupId'],
          references: { schema: 'public', table: 'ProductModifierGroup', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductModifierGroup',
        foreignKey: {
          name: 'ProductModifierGroup_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductModifierGroup',
        foreignKey: {
          name: 'ProductModifierGroup_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductModifier' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductModifierGroup' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
