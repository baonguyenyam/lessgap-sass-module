#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8df07bc27c1ad7747df83fe7ab886e71c2fd0bb92caff790fca3245ff65d21d7/contract';
import startContract from '../../snapshots/8df07bc27c1ad7747df83fe7ab886e71c2fd0bb92caff790fca3245ff65d21d7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d7db91618cbf15dda1340e26963f9fbd88d338024bff3d79ad5d432d27788be1/contract';
import endContract from '../../snapshots/d7db91618cbf15dda1340e26963f9fbd88d338024bff3d79ad5d432d27788be1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Purchase',
        column: col('addOnId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Purchase', column: 'planId' }),
      this.addForeignKey({
        schema: 'public',
        table: 'Purchase',
        foreignKey: {
          name: 'Purchase_addOnId_fkey',
          columns: ['addOnId'],
          references: { schema: 'public', table: 'AddOn', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
