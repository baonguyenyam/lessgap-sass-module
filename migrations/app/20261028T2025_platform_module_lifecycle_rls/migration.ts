#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8c99af7f60019a92483c3f208895037e02b27a7de263b79a36b9507526c4e23d/contract';
import endContract from '../../snapshots/8c99af7f60019a92483c3f208895037e02b27a7de263b79a36b9507526c4e23d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/be83488f234d67800c42f71a1b3f2b948fc5286751d4655057a6d0a872211c52/contract';
import startContract from '../../snapshots/be83488f234d67800c42f71a1b3f2b948fc5286751d4655057a6d0a872211c52/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.enableRowLevelSecurity({ schema: 'public', table: 'ModuleExport' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ModulePurge' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
