#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/30f14e0651daa25408ef25150422756ade5dd16e0462ad2b0edf28e19c6395cc/contract';
import startContract from '../../snapshots/30f14e0651daa25408ef25150422756ade5dd16e0462ad2b0edf28e19c6395cc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/78be6818fa3798ebdec8eaff5d8335b31419e76e083cd0a7f9220d8b5deaa05c/contract';
import endContract from '../../snapshots/78be6818fa3798ebdec8eaff5d8335b31419e76e083cd0a7f9220d8b5deaa05c/contract.json' with { type: 'json' };
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
        typeName: 'JobStatus',
        members: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Job',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('finishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lockedUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('maxAttempts', 'int4', {
            notNull: true,
            default: lit(5),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('payload', 'json', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('runAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', '"JobStatus"', {
            notNull: true,
            default: lit('QUEUED'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'JobStatus' } },
          }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Job_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Job',
        index: 'Job_kind_status_idx',
        columns: ['kind', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Job',
        index: 'Job_status_runAt_idx',
        columns: ['status', 'runAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
