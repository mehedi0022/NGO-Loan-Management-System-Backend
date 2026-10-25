#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/22c409d88f57ddccf66390be2bcbd359e57849d399857ac8c2f51a803360c83d/contract';
import startContract from '../../snapshots/22c409d88f57ddccf66390be2bcbd359e57849d399857ac8c2f51a803360c83d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/384516f329987c62d90f0979d92e84161a9b40a26a181c555db15598091d5be3/contract';
import endContract from '../../snapshots/384516f329987c62d90f0979d92e84161a9b40a26a181c555db15598091d5be3/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_25d457a5',
      }),
      this.createTable({
        schema: 'public',
        table: 'somiti',
        columns: [
          col('code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fieldOfficerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('meetingDay', 'text', {
            notNull: true,
            default: lit('SUNDAY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('meetingTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('somitiId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('union', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('village', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'somiti_meetingDay_check_08e514e5',
            "\"meetingDay\" IN ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY')",
          ),
          checkExpression('somiti_status_check_ee520df2', "\"status\" IN ('ACTIVE', 'INACTIVE')"),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'member',
        column: col('somitiId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'somiti',
        constraint: 'somiti_somitiId_key',
        columns: ['somitiId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'somiti',
        constraint: 'somiti_code_key',
        columns: ['code'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_7a8dd56c',
        expression: "\"role\" IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FIELD_OFFICER')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_somitiId_idx_7b1f646c',
        columns: ['somitiId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'somiti',
        index: 'somiti_fieldOfficerId_idx_301d219a',
        columns: ['fieldOfficerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'somiti',
        index: 'somiti_meetingDay_idx_c7d78d1d',
        columns: ['meetingDay'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'somiti',
        index: 'somiti_name_idx_ce87e6ba',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'somiti',
        index: 'somiti_somitiId_idx_7b1f646c',
        columns: ['somitiId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'somiti',
        index: 'somiti_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'somiti',
        foreignKey: {
          name: 'somiti_fieldOfficerId_fkey',
          columns: ['fieldOfficerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'member',
        foreignKey: {
          name: 'member_somitiId_fkey',
          columns: ['somitiId'],
          references: { schema: 'public', table: 'somiti', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
