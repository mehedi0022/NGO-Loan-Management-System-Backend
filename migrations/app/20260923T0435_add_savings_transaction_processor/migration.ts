#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/24939d32cc6d246f96345af59c83c8dc2d6989646349d56ce880cfad58309ddf/contract';
import endContract from '../../snapshots/24939d32cc6d246f96345af59c83c8dc2d6989646349d56ce880cfad58309ddf/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ac44192022321b1dfc1a3fd9f60e0eadf7cb5e77389b3fd847ba29dcf73afb26/contract';
import startContract from '../../snapshots/ac44192022321b1dfc1a3fd9f60e0eadf7cb5e77389b3fd847ba29dcf73afb26/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'savingsTransaction',
        column: col('processedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_processedById_idx_92dfd8d4',
        columns: ['processedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'savingsTransaction',
        foreignKey: {
          name: 'savingsTransaction_processedById_fkey',
          columns: ['processedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
