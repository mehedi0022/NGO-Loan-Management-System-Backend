#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1b0a91a4bd5b872f828da1db2bbb1816f3ed89ee99ba16c3f2e749111868caaa/contract';
import startContract from '../../snapshots/1b0a91a4bd5b872f828da1db2bbb1816f3ed89ee99ba16c3f2e749111868caaa/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract';
import endContract from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract.json' with { type: 'json' };
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
      this.createTable({
        schema: 'public',
        table: 'dayClosing',
        columns: [
          col('admissionFee', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('businessDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('capitalReceived', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('closedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('closingBalance', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dpsDeposit', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('dpsWithdrawn', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isHoliday', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('loanCollection', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('loanDisbursed', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('officeExpense', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('openedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('openingBalance', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('otherIncome', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('savingsDeposit', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('savingsWithdrawn', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalCashIn', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('totalCashOut', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('dayClosing_status_check_32214e16', "\"status\" IN ('OPEN', 'CLOSED')"),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dayClosing',
        constraint: 'dayClosing_businessDate_key',
        columns: ['businessDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dayClosing',
        index: 'dayClosing_businessDate_idx_d7852a03',
        columns: ['businessDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dayClosing',
        index: 'dayClosing_closedById_idx_3fbe6e44',
        columns: ['closedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dayClosing',
        index: 'dayClosing_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dayClosing',
        foreignKey: {
          name: 'dayClosing_closedById_fkey',
          columns: ['closedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
