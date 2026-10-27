#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract';
import endContract from '../../snapshots/004a91fb8116703322e94ba8acc304b66126f9826a2a97be90f2d694527f1ebc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da3af3cf3aabe9ca22f6e8d350842c076001db582c8665c3bd8046b9a2a7dcbc/contract';
import startContract from '../../snapshots/da3af3cf3aabe9ca22f6e8d350842c076001db582c8665c3bd8046b9a2a7dcbc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Member',
        column: col('status', 'text', {
          notNull: true,
          default: lit('active'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
