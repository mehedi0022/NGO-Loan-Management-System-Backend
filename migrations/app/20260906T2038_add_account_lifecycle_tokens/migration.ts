#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ed7423a89e65ce3b3fc53ce7bface62d496c405566f472fc4629d98dfe118f3b/contract';
import endContract from '../../snapshots/ed7423a89e65ce3b3fc53ce7bface62d496c405566f472fc4629d98dfe118f3b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ef7bd88d8f2b9ba740a317a5ccfbb1ae897478e061d6306515f8e8ab45b6d679/contract';
import startContract from '../../snapshots/ef7bd88d8f2b9ba740a317a5ccfbb1ae897478e061d6306515f8e8ab45b6d679/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'accountToken',
        columns: [
          col('consumedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'accountToken_type_check_ac18db37',
            "\"type\" IN ('PASSWORD_RESET', 'EMAIL_VERIFICATION')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('emailVerifiedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'accountToken',
        constraint: 'accountToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountToken',
        index: 'accountToken_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountToken',
        index: 'accountToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountToken',
        index: 'accountToken_userId_type_idx_59b0b5ce',
        columns: ['userId', 'type'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'accountToken',
        foreignKey: {
          name: 'accountToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
