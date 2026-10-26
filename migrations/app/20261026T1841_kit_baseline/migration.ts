#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6425f176da7cdd42a5091eea9f236b85b289d5e14ecc142e9769bfaee587819d/contract';
import endContract from '../../snapshots/6425f176da7cdd42a5091eea9f236b85b289d5e14ecc142e9769bfaee587819d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'BillingInterval',
        members: ['MONTH', 'YEAR', 'ONE_TIME'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PurchaseStatus',
        members: ['COMPLETED', 'REFUNDED'],
      }),
      this.createNativeEnumType({ schema: 'public', typeName: 'Role', members: ['USER', 'ADMIN'] }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'SubscriptionStatus',
        members: ['ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING', 'INCOMPLETE'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Account',
        columns: [
          col('accessToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accessTokenExpiresAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('refreshToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshTokenExpiresAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('scope', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Account_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'NewsletterSubscriber',
        columns: [
          col('confirmToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('confirmedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('waitlist'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('unsubscribeToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unsubscribedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'NewsletterSubscriber_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Plan',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('features', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('interval', '"BillingInterval"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'BillingInterval' } },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('meterEventName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('stripePriceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trialDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Plan_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Project',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Project_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Purchase',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
          col('planId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"PurchaseStatus"', {
            notNull: true,
            default: lit('COMPLETED'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PurchaseStatus' } },
          }),
          col('stripeCheckoutSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stripePaymentIntentId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Purchase_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Session_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Subscription',
        columns: [
          col('cancelAtPeriodEnd', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('currentPeriodEnd', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('currentPeriodStart', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('planId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"SubscriptionStatus"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'SubscriptionStatus' } },
          }),
          col('stripeSubscriptionId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('trialEndsAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Subscription_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'TwoFactor',
        columns: [
          col('backupCodes', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('failedVerificationCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lockedUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('secret', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('verified', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'TwoFactor_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailVerified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('onboardingDismissedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('role', '"Role"', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Role' } },
          }),
          col('stripeCustomerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('twoFactorEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'User_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Verification',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('identifier', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Verification_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Account',
        index: 'Account_providerId_accountId_key',
        columns: ['providerId', 'accountId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Account',
        index: 'Account_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_confirmToken_key',
        columns: ['confirmToken'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'NewsletterSubscriber',
        index: 'NewsletterSubscriber_unsubscribeToken_key',
        columns: ['unsubscribeToken'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Plan',
        index: 'Plan_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Plan',
        index: 'Plan_stripePriceId_key',
        columns: ['stripePriceId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Project',
        index: 'Project_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'Purchase_stripeCheckoutSessionId_key',
        columns: ['stripeCheckoutSessionId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'Purchase_stripePaymentIntentId_key',
        columns: ['stripePaymentIntentId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Purchase',
        index: 'Purchase_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_token_key',
        columns: ['token'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Subscription',
        index: 'Subscription_stripeSubscriptionId_key',
        columns: ['stripeSubscriptionId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Subscription',
        index: 'Subscription_userId_key',
        columns: ['userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'TwoFactor',
        index: 'TwoFactor_secret_idx',
        columns: ['secret'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TwoFactor',
        index: 'TwoFactor_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_stripeCustomerId_key',
        columns: ['stripeCustomerId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Verification',
        index: 'Verification_identifier_idx',
        columns: ['identifier'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Account',
        foreignKey: {
          name: 'Account_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Project',
        foreignKey: {
          name: 'Project_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_planId_fkey',
          columns: ['planId'],
          references: { schema: 'public', table: 'Plan', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Subscription',
        foreignKey: {
          name: 'Subscription_planId_fkey',
          columns: ['planId'],
          references: { schema: 'public', table: 'Plan', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Subscription',
        foreignKey: {
          name: 'Subscription_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TwoFactor',
        foreignKey: {
          name: 'TwoFactor_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
