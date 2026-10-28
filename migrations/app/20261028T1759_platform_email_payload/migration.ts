#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/368c0f832bf717aae07a211a316faa92e5b72946f90895162a8e58bbaa1a0def/contract';
import endContract from '../../snapshots/368c0f832bf717aae07a211a316faa92e5b72946f90895162a8e58bbaa1a0def/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4c38a62ad25336ed1418a5be092074fd47a9186f4fa2190b367a94a86e198c63/contract';
import startContract from '../../snapshots/4c38a62ad25336ed1418a5be092074fd47a9186f4fa2190b367a94a86e198c63/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'EmailMessage',
        column: col('payload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
