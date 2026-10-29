#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/374f3050ec67ee3e667e52179b395e16555f73ad14a1781f942ca906cd583602/contract';
import startContract from '../../snapshots/374f3050ec67ee3e667e52179b395e16555f73ad14a1781f942ca906cd583602/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8d60169c1af5cce79877ac5e26844afd89f12bd39cd31c8e8bee0ff5e3fd1bd8/contract';
import endContract from '../../snapshots/8d60169c1af5cce79877ac5e26844afd89f12bd39cd31c8e8bee0ff5e3fd1bd8/contract.json' with { type: 'json' };
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
        table: 'ChatConversation',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('visitorKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ChatConversation_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ChatMessage',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('user'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sourcesJson', 'json', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/json@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ChatMessage_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'KnowledgeChunk',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('embedding', 'vector(384)', {
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 384 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('language', 'text', {
            notNull: true,
            default: lit('en'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'KnowledgeChunk_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'KnowledgeSource',
        columns: [
          col('checksum', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('embeddingModel', 'text', {
            notNull: true,
            default: lit('local'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('page'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'KnowledgeSource_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatConversation',
        index: 'ChatConversation_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_conversationId_idx',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'KnowledgeChunk',
        index: 'KnowledgeChunk_sourceId_idx',
        columns: ['sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'KnowledgeChunk',
        index: 'KnowledgeChunk_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'KnowledgeSource',
        index: 'KnowledgeSource_tenantId_idx',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatConversation',
        foreignKey: {
          name: 'ChatConversation_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatMessage',
        foreignKey: {
          name: 'ChatMessage_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatMessage',
        foreignKey: {
          name: 'ChatMessage_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'ChatConversation', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'KnowledgeChunk',
        foreignKey: {
          name: 'KnowledgeChunk_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'KnowledgeChunk',
        foreignKey: {
          name: 'KnowledgeChunk_sourceId_fkey',
          columns: ['sourceId'],
          references: { schema: 'public', table: 'KnowledgeSource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'KnowledgeSource',
        foreignKey: {
          name: 'KnowledgeSource_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ChatConversation' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ChatMessage' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'KnowledgeChunk' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'KnowledgeSource' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
