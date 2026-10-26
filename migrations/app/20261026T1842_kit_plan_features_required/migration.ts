#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/443e445118308f1cbde9721614e1678ce840f138f0dde25340e64d5edba25a7d/contract';
import endContract from '../../snapshots/443e445118308f1cbde9721614e1678ce840f138f0dde25340e64d5edba25a7d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6425f176da7cdd42a5091eea9f236b85b289d5e14ecc142e9769bfaee587819d/contract';
import startContract from '../../snapshots/6425f176da7cdd42a5091eea9f236b85b289d5e14ecc142e9769bfaee587819d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

// Prisma 7 created `Plan.features` as a nullable `text[]`; the contract makes
// it required with non-null elements. Rows written by Prisma 7 always held an
// array, but a row inserted by hand could hold NULL, so those become `{}`
// before the column is tightened. Elements cannot be NULL through either ORM.
const { sql: db, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dataTransform(contract, 'backfill-plan-features', {
        backfillsColumn: { schema: 'public', table: 'Plan', column: 'features' },
        check: () => db.public.Plan.select('id').where((f, fns) => fns.eq(f.features, null)).limit(1),
        run: () => db.public.Plan.update({ features: [] }).where((f, fns) => fns.eq(f.features, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Plan', column: 'features' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Plan',
        constraint: 'Plan_features_elem_not_null_1a661718',
        expression: sql`array_position("features", NULL) IS NULL`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
