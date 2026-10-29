#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0c841be9954d48a5fd4fb5444ad1f301dd2683a64814313616704d87d02d9a2d/contract';
import startContract from '../../snapshots/0c841be9954d48a5fd4fb5444ad1f301dd2683a64814313616704d87d02d9a2d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/374f3050ec67ee3e667e52179b395e16555f73ad14a1781f942ca906cd583602/contract';
import endContract from '../../snapshots/374f3050ec67ee3e667e52179b395e16555f73ad14a1781f942ca906cd583602/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Service',
        column: col('depositCents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
