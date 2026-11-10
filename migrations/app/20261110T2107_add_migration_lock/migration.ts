#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract';
import startContract from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bfb3abc3b661db41e009d63755894323da542666ad9cb23dd3cf0da05fbb8fbc/contract';
import endContract from '../../snapshots/bfb3abc3b661db41e009d63755894323da542666ad9cb23dd3cf0da05fbb8fbc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'organizationSetting',
        column: col('migrationLocked', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
