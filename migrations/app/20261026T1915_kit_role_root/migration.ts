#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/443e445118308f1cbde9721614e1678ce840f138f0dde25340e64d5edba25a7d/contract';
import startContract from '../../snapshots/443e445118308f1cbde9721614e1678ce840f138f0dde25340e64d5edba25a7d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6537a51315de601b1ef71dffb3c857257730401726744069f6f97681de139818/contract';
import endContract from '../../snapshots/6537a51315de601b1ef71dffb3c857257730401726744069f6f97681de139818/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.addNativeEnumValue({ schema: 'public', typeName: 'Role', value: 'ROOT' })];
  }
}

MigrationCLI.run(import.meta.url, M);
