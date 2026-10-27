#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4e0598a39b7e69afc5db6061cedcf87a754371b45ad0dc65cd5bee8d91139fce/contract';
import startContract from '../../snapshots/4e0598a39b7e69afc5db6061cedcf87a754371b45ad0dc65cd5bee8d91139fce/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ebc4c2460e7cdc1032d5b4a73228cba406b394a3ad2e01f889ff24074f90b6a6/contract';
import endContract from '../../snapshots/ebc4c2460e7cdc1032d5b4a73228cba406b394a3ad2e01f889ff24074f90b6a6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Session',
        column: col('activeOrganizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
