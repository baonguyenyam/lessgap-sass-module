#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/78be6818fa3798ebdec8eaff5d8335b31419e76e083cd0a7f9220d8b5deaa05c/contract';
import startContract from '../../snapshots/78be6818fa3798ebdec8eaff5d8335b31419e76e083cd0a7f9220d8b5deaa05c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f8d3dd8f8d36ebcd41534cbe8ea5845782cdb2570d2ab12b75a9f5727d3a8dcc/contract';
import endContract from '../../snapshots/f8d3dd8f8d36ebcd41534cbe8ea5845782cdb2570d2ab12b75a9f5727d3a8dcc/contract.json' with { type: 'json' };
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
        typeName: 'EmailStatus',
        members: ['QUEUED', 'SENT', 'REFUSED', 'FAILED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'EmailMessage',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerMessageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', '"EmailStatus"', {
            notNull: true,
            default: lit('QUEUED'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'EmailStatus' } },
          }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('toAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'EmailMessage_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailMessage',
        index: 'EmailMessage_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailMessage',
        index: 'EmailMessage_tenantId_createdAt_idx',
        columns: ['tenantId', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
