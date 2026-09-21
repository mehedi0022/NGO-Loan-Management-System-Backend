#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/837a0079a0660c62e57eff5b307a37903cf38b0d841e60229ad8fed0619c1708/contract';
import startContract from '../../snapshots/837a0079a0660c62e57eff5b307a37903cf38b0d841e60229ad8fed0619c1708/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ca024c2f701a1b515b7db42cc5d887705779075540a9aba6ca4a2744ccfd77f5/contract';
import endContract from '../../snapshots/ca024c2f701a1b515b7db42cc5d887705779075540a9aba6ca4a2744ccfd77f5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('approvedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('approvedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('rejectedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('rejectedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'loan',
        column: col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_approvedById_idx_01ef8410',
        columns: ['approvedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_rejectedById_idx_a6ee2717',
        columns: ['rejectedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_approvedById_fkey',
          columns: ['approvedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_rejectedById_fkey',
          columns: ['rejectedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
