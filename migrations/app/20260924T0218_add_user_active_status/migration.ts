#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/22c409d88f57ddccf66390be2bcbd359e57849d399857ac8c2f51a803360c83d/contract';
import endContract from '../../snapshots/22c409d88f57ddccf66390be2bcbd359e57849d399857ac8c2f51a803360c83d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/24939d32cc6d246f96345af59c83c8dc2d6989646349d56ce880cfad58309ddf/contract';
import startContract from '../../snapshots/24939d32cc6d246f96345af59c83c8dc2d6989646349d56ce880cfad58309ddf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
