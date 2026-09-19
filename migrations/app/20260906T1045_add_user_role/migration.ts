#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7f19ea078198f9a72504817d36dd6f8dc7749386da1ff2d29028d15e595ccf8f/contract';
import startContract from '../../snapshots/7f19ea078198f9a72504817d36dd6f8dc7749386da1ff2d29028d15e595ccf8f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ef7bd88d8f2b9ba740a317a5ccfbb1ae897478e061d6306515f8e8ab45b6d679/contract';
import endContract from '../../snapshots/ef7bd88d8f2b9ba740a317a5ccfbb1ae897478e061d6306515f8e8ab45b6d679/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_6626637a',
        expression:
          "\"role\" IN ('SUPER_ADMIN', 'ADMIN', 'USER', 'CUSTOMER', 'MODERATOR', 'AUTHOR', 'MANAGER')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
