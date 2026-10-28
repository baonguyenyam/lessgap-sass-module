#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8df07bc27c1ad7747df83fe7ab886e71c2fd0bb92caff790fca3245ff65d21d7/contract';
import endContract from '../../snapshots/8df07bc27c1ad7747df83fe7ab886e71c2fd0bb92caff790fca3245ff65d21d7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c08b36563264571a863a535b9c306ad9c0305559b75497eb2ba95c132bc40e2b/contract';
import startContract from '../../snapshots/c08b36563264571a863a535b9c306ad9c0305559b75497eb2ba95c132bc40e2b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropNotNull({ schema: 'public', table: 'Subscription', column: 'stripeSubscriptionId' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
