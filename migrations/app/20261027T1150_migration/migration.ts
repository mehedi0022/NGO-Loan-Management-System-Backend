#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract';
import endContract from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fd3adc1d510f0b5aae22d9e36e0cfbf7e10ce0b4977d2758cd74955ffbd2df9f/contract';
import startContract from '../../snapshots/fd3adc1d510f0b5aae22d9e36e0cfbf7e10ce0b4977d2758cd74955ffbd2df9f/contract.json' with { type: 'json' };
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
        table: 'accountTransaction',
        columns: [
          col('accountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('balanceAfter', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('balanceBefore', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceModule', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('transactionDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('transactionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'accountTransaction_sourceModule_check_3daa8bba',
            "\"sourceModule\" IN ('CAPITAL_INJECTION', 'MEMBER_ADMISSION', 'LOAN_DISBURSEMENT', 'LOAN_COLLECTION', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'DPS_DEPOSIT', 'DPS_WITHDRAWAL', 'OFFICE_EXPENSE', 'OTHER_INCOME', 'FUND_TRANSFER')",
          ),
          checkExpression(
            'accountTransaction_type_check_4b8e93d7',
            "\"type\" IN ('DEBIT', 'CREDIT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'financialAccount',
        columns: [
          col('accountName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('accountNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accountType', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('bankName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('branchName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currentBalance', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'financialAccount_accountType_check_2016956a',
            "\"accountType\" IN ('CASH', 'BANK', 'MOBILE_BANKING')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'member',
        column: col('admissionFee', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'accountTransaction',
        constraint: 'accountTransaction_transactionId_key',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_sourceModule_idx_9c8fc029',
        columns: ['sourceModule'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_transactionDate_idx_b449edf8',
        columns: ['transactionDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_transactionId_idx_d3180832',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'accountTransaction',
        index: 'accountTransaction_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'financialAccount',
        index: 'financialAccount_accountType_idx_177ee31e',
        columns: ['accountType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'financialAccount',
        index: 'financialAccount_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'financialAccount',
        index: 'financialAccount_isDefault_idx_2a24e9d7',
        columns: ['isDefault'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'accountTransaction',
        foreignKey: {
          name: 'accountTransaction_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'financialAccount', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'accountTransaction',
        foreignKey: {
          name: 'accountTransaction_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
