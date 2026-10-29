#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6b0e2b0a00fb3889a1c34ee1bb2ae5c2f6d51509ab92c6cc5a3e955f231f9edc/contract';
import endContract from '../../snapshots/6b0e2b0a00fb3889a1c34ee1bb2ae5c2f6d51509ab92c6cc5a3e955f231f9edc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/893b1472ff25622df296557ccb8476cec8acc2cfaa4340d979a2c29cdd4c50ea/contract';
import startContract from '../../snapshots/893b1472ff25622df296557ccb8476cec8acc2cfaa4340d979a2c29cdd4c50ea/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createRlsPolicy({
        schema: 'public',
        table: 'EntitlementOverride',
        policy: {
          naming: { kind: 'wire', prefix: 'entitlement_override_isolation', hash: 'c516f4ff' },
          tableName: 'EntitlementOverride',
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
        table: 'NewsletterSubscriber',
        policy: {
          naming: { kind: 'wire', prefix: 'newsletter_subscriber_isolation', hash: 'c516f4ff' },
          tableName: 'NewsletterSubscriber',
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
