#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/540cd940fb42ab06b8ffb43bd4242d7f2635370745164898d325fe0f6eb8f0c9/contract';
import endContract from '../../snapshots/540cd940fb42ab06b8ffb43bd4242d7f2635370745164898d325fe0f6eb8f0c9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b900b0724b652578e11ba114916c8d0436bad6d52ef689cccce2d37f2d3a670b/contract';
import startContract from '../../snapshots/b900b0724b652578e11ba114916c8d0436bad6d52ef689cccce2d37f2d3a670b/contract.json' with { type: 'json' };
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
        table: 'dpsAccount',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dpsNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('durationMonths', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installmentAmount', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('interestRate', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('maturityAmount', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('maturityDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('openedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('paidInstallments', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('startDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalPaidAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('totalPrincipal', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'dpsAccount_status_check_c62bdaf7',
            "\"status\" IN ('ACTIVE', 'MATURED', 'CLOSED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'dpsInstallment',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dpsAccountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installmentNo', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paidAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'dpsInstallment_status_check_b0be9e9f',
            "\"status\" IN ('PENDING', 'PARTIAL', 'PAID')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'dpsTransaction',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('balanceAfter', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('balanceBefore', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('collectionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dpsAccountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('processedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
            'dpsTransaction_paymentMethod_check_1ac18d5d',
            "\"paymentMethod\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHEQUE', 'OTHER')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection',
        column: col('dpsAmount', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'dpsAccount',
        constraint: 'dpsAccount_dpsNumber_key',
        columns: ['dpsNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dpsInstallment',
        constraint: 'dpsInstallment_dpsAccountId_installmentNo_key',
        columns: ['dpsAccountId', 'installmentNo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'dpsTransaction',
        constraint: 'dpsTransaction_transactionId_key',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsAccount',
        index: 'dpsAccount_dpsNumber_idx_a640da47',
        columns: ['dpsNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsAccount',
        index: 'dpsAccount_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsAccount',
        index: 'dpsAccount_openedById_idx_40bfe2c9',
        columns: ['openedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsAccount',
        index: 'dpsAccount_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsInstallment',
        index: 'dpsInstallment_dpsAccountId_idx_94a05b9b',
        columns: ['dpsAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsInstallment',
        index: 'dpsInstallment_dueDate_idx_fb527616',
        columns: ['dueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsTransaction',
        index: 'dpsTransaction_collectionId_idx_b344fc1a',
        columns: ['collectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsTransaction',
        index: 'dpsTransaction_dpsAccountId_idx_94a05b9b',
        columns: ['dpsAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'dpsTransaction',
        index: 'dpsTransaction_processedById_idx_92dfd8d4',
        columns: ['processedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsAccount',
        foreignKey: {
          name: 'dpsAccount_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsAccount',
        foreignKey: {
          name: 'dpsAccount_openedById_fkey',
          columns: ['openedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsInstallment',
        foreignKey: {
          name: 'dpsInstallment_dpsAccountId_fkey',
          columns: ['dpsAccountId'],
          references: { schema: 'public', table: 'dpsAccount', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsTransaction',
        foreignKey: {
          name: 'dpsTransaction_dpsAccountId_fkey',
          columns: ['dpsAccountId'],
          references: { schema: 'public', table: 'dpsAccount', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsTransaction',
        foreignKey: {
          name: 'dpsTransaction_collectionId_fkey',
          columns: ['collectionId'],
          references: { schema: 'public', table: 'collection', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'dpsTransaction',
        foreignKey: {
          name: 'dpsTransaction_processedById_fkey',
          columns: ['processedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
