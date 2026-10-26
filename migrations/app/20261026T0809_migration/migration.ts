#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/384516f329987c62d90f0979d92e84161a9b40a26a181c555db15598091d5be3/contract';
import startContract from '../../snapshots/384516f329987c62d90f0979d92e84161a9b40a26a181c555db15598091d5be3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/745e5d9c748a2d6f36a077401f335429a887c1877f5f79fbfdce91d564514a87/contract';
import endContract from '../../snapshots/745e5d9c748a2d6f36a077401f335429a887c1877f5f79fbfdce91d564514a87/contract.json' with { type: 'json' };
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
        table: 'incomeExpense',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('categoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('date', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('somitiId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('voucherNo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'incomeExpense_paymentMethod_check_1ac18d5d',
            "\"paymentMethod\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHEQUE', 'OTHER')",
          ),
          checkExpression('incomeExpense_type_check_5d925dfc', "\"type\" IN ('INCOME', 'EXPENSE')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'transactionCategory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isSystem', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'transactionCategory_type_check_5d925dfc',
            "\"type\" IN ('INCOME', 'EXPENSE')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'incomeExpense',
        constraint: 'incomeExpense_voucherNo_key',
        columns: ['voucherNo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'transactionCategory',
        constraint: 'transactionCategory_name_type_key',
        columns: ['name', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_date_idx_b4ca319c',
        columns: ['date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_paymentMethod_idx_25bac06e',
        columns: ['paymentMethod'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_somitiId_idx_7b1f646c',
        columns: ['somitiId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'incomeExpense',
        index: 'incomeExpense_voucherNo_idx_b96efe4a',
        columns: ['voucherNo'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transactionCategory',
        index: 'transactionCategory_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transactionCategory',
        index: 'transactionCategory_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'incomeExpense',
        foreignKey: {
          name: 'incomeExpense_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'transactionCategory', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'incomeExpense',
        foreignKey: {
          name: 'incomeExpense_somitiId_fkey',
          columns: ['somitiId'],
          references: { schema: 'public', table: 'somiti', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'incomeExpense',
        foreignKey: {
          name: 'incomeExpense_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
