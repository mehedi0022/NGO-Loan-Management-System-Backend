#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1af527ba56404b48cbc785f0b32e2758591ed8bc41145e3a7ead18324a4446b5/contract';
import startContract from '../../snapshots/1af527ba56404b48cbc785f0b32e2758591ed8bc41145e3a7ead18324a4446b5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ac44192022321b1dfc1a3fd9f60e0eadf7cb5e77389b3fd847ba29dcf73afb26/contract';
import endContract from '../../snapshots/ac44192022321b1dfc1a3fd9f60e0eadf7cb5e77389b3fd847ba29dcf73afb26/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'collection',
        column: col('generalSavingsAmount', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection',
        column: col('loanCollectionAmount', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection',
        column: col('specialSavingsAmount', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection',
        column: col('totalAmount', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
