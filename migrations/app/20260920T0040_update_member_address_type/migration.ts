#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/70643497f3ebedb52d1710887b632410c3112a7b17aa5c9a2083cca0f6bc534a/contract';
import endContract from '../../snapshots/70643497f3ebedb52d1710887b632410c3112a7b17aa5c9a2083cca0f6bc534a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract';
import startContract from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'memberAddress',
        constraint: 'memberAddress_type_check_60c1240d',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'memberAddress',
        constraint: 'memberAddress_type_check_4dfe7b6a',
        expression: "\"type\" IN ('PRESENT', 'FATHER_HOME')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
