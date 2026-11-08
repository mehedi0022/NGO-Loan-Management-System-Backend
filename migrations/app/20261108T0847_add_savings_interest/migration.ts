#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1b0a91a4bd5b872f828da1db2bbb1816f3ed89ee99ba16c3f2e749111868caaa/contract';
import endContract from '../../snapshots/1b0a91a4bd5b872f828da1db2bbb1816f3ed89ee99ba16c3f2e749111868caaa/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract';
import startContract from '../../snapshots/a355720713e26aa0cd849ef1fbcf026e50eb88d6d2fb0ba8405a6a667bfe0a40/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

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
