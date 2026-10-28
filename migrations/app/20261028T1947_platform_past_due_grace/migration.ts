#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d7db91618cbf15dda1340e26963f9fbd88d338024bff3d79ad5d432d27788be1/contract';
import startContract from '../../snapshots/d7db91618cbf15dda1340e26963f9fbd88d338024bff3d79ad5d432d27788be1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e783cff1bc4fdfbefa763aacf334641be18a56caf96a874e96a39b3a2e39157f/contract';
import endContract from '../../snapshots/e783cff1bc4fdfbefa763aacf334641be18a56caf96a874e96a39b3a2e39157f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Plan',
        column: col('gracePeriodDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('graceUntil', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
