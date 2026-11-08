#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract';
import endContract from '../../snapshots/5c93ead816eb32c0ec43246d2c89e60b7c83bb4bd59902422a7e8cfa0e0ba7d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract';
import startContract from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract.json' with { type: 'json' };
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
        table: 'savingsTransaction',
        constraint: 'savingsTransaction_type_check_e2220677',
      }),
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
      this.createTable({
        schema: 'public',
        table: 'savingsInterestPosting',
        columns: [
          col('compoundingInterval', 'text', {
            notNull: true,
            default: lit('QUARTERLY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('generalSavingsRate', 'numeric', {
            notNull: true,
            default: lit('6'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('periodEndDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('periodStartDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('postedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('postingCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('specialSavingsRate', 'numeric', {
            notNull: true,
            default: lit('7'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('totalAccountsCredited', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('totalGeneralInterest', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('totalSpecialInterest', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'organizationSetting',
        column: col('generalSavingsInterestRate', 'numeric', {
          notNull: true,
          default: lit('6'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'organizationSetting',
        column: col('savingsCompoundingInterval', 'text', {
          notNull: true,
          default: lit('QUARTERLY'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'organizationSetting',
        column: col('specialSavingsInterestRate', 'numeric', {
          notNull: true,
          default: lit('7'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'dayClosing',
        constraint: 'dayClosing_businessDate_key',
        columns: ['businessDate'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'savingsInterestPosting',
        constraint: 'savingsInterestPosting_postingCode_key',
        columns: ['postingCode'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'savingsTransaction',
        constraint: 'savingsTransaction_type_check_849d4e3d',
        expression: "\"type\" IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST')",
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
      this.createIndex({
        schema: 'public',
        table: 'savingsInterestPosting',
        index: 'savingsInterestPosting_periodEndDate_idx_a01056c2',
        columns: ['periodEndDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsInterestPosting',
        index: 'savingsInterestPosting_periodStartDate_idx_e9f0fc7b',
        columns: ['periodStartDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsInterestPosting',
        index: 'savingsInterestPosting_postedById_idx_fa804b55',
        columns: ['postedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsInterestPosting',
        index: 'savingsInterestPosting_postingCode_idx_75e1fa94',
        columns: ['postingCode'],
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
      this.addForeignKey({
        schema: 'public',
        table: 'savingsInterestPosting',
        foreignKey: {
          name: 'savingsInterestPosting_postedById_fkey',
          columns: ['postedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
