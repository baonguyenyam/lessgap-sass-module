#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/00b73f1f528cf36de72a63ecdcc06381dd0e18804d485930075a3534fcf61950/contract';
import startContract from '../../snapshots/00b73f1f528cf36de72a63ecdcc06381dd0e18804d485930075a3534fcf61950/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6bf04ecc1667a327be6255ff2ff9399609f1aa86156e07ecd893b7e058854236/contract';
import endContract from '../../snapshots/6bf04ecc1667a327be6255ff2ff9399609f1aa86156e07ecd893b7e058854236/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createRlsPolicy({
        schema: 'public',
        table: 'MemberNotification',
        policy: {
          naming: { kind: 'wire', prefix: 'member_notification_isolation', hash: 'c516f4ff' },
          tableName: 'MemberNotification',
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
