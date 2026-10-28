#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/380db2a5812355eca8175dd24a64a1cff5f2e49d0b34ac36ad06b14704761259/contract';
import endContract from '../../snapshots/380db2a5812355eca8175dd24a64a1cff5f2e49d0b34ac36ad06b14704761259/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8d3dd8f8d36ebcd41534cbe8ea5845782cdb2570d2ab12b75a9f5727d3a8dcc/contract';
import startContract from '../../snapshots/f8d3dd8f8d36ebcd41534cbe8ea5845782cdb2570d2ab12b75a9f5727d3a8dcc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.enableRowLevelSecurity({ schema: 'public', table: 'TenantSetting' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'TenantSetting',
        policy: {
          naming: { kind: 'wire', prefix: 'tenant_setting_isolation', hash: 'c516f4ff' },
          tableName: 'TenantSetting',
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
