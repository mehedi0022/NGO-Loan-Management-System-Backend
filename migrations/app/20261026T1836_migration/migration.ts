#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/540cd940fb42ab06b8ffb43bd4242d7f2635370745164898d325fe0f6eb8f0c9/contract';
import startContract from '../../snapshots/540cd940fb42ab06b8ffb43bd4242d7f2635370745164898d325fe0f6eb8f0c9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fd3adc1d510f0b5aae22d9e36e0cfbf7e10ce0b4977d2758cd74955ffbd2df9f/contract';
import endContract from '../../snapshots/fd3adc1d510f0b5aae22d9e36e0cfbf7e10ce0b4977d2758cd74955ffbd2df9f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'dpsAccount',
        column: col('frequency', 'text', {
          notNull: true,
          default: lit('MONTHLY'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'dpsAccount',
        constraint: 'dpsAccount_frequency_check_a03ca8f9',
        expression: "\"frequency\" IN ('WEEKLY', 'MONTHLY')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
