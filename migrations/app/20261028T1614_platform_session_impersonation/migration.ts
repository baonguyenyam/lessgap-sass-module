#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4c38a62ad25336ed1418a5be092074fd47a9186f4fa2190b367a94a86e198c63/contract';
import endContract from '../../snapshots/4c38a62ad25336ed1418a5be092074fd47a9186f4fa2190b367a94a86e198c63/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d927132041fdd4862a0a32a8c3ff5253e06d5165b4dfe61d3e7ee9f650483a2e/contract';
import startContract from '../../snapshots/d927132041fdd4862a0a32a8c3ff5253e06d5165b4dfe61d3e7ee9f650483a2e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('impersonationReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('impersonationTenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
