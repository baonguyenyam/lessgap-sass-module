#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/261486cc3557069867398d8541b07c6ad27d09f8fb5df1f59384290842d32081/contract';
import endContract from '../../snapshots/261486cc3557069867398d8541b07c6ad27d09f8fb5df1f59384290842d32081/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6537a51315de601b1ef71dffb3c857257730401726744069f6f97681de139818/contract';
import startContract from '../../snapshots/6537a51315de601b1ef71dffb3c857257730401726744069f6f97681de139818/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('switchedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
