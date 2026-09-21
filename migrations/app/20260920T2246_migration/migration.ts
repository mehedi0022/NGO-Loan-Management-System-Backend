#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/837a0079a0660c62e57eff5b307a37903cf38b0d841e60229ad8fed0619c1708/contract';
import endContract from '../../snapshots/837a0079a0660c62e57eff5b307a37903cf38b0d841e60229ad8fed0619c1708/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract';
import startContract from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract.json' with { type: 'json' };
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
        table: 'memberAddress',
        constraint: 'memberAddress_type_check_60c1240d',
      }),
      this.createTable({
        schema: 'public',
        table: 'loan',
        columns: [
          col('applicationDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('chargeAmount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('chargeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('chargeValue', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('disbursementDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('firstDueDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('frequency', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installmentAmount', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('installmentCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('loanId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('maturityDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('principalAmount', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('purpose', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalPayable', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'loan_chargeType_check_66e0b4fc',
            "\"chargeType\" IN ('FLAT', 'PERCENTAGE')",
          ),
          checkExpression(
            'loan_frequency_check_a03ca8f9',
            "\"frequency\" IN ('WEEKLY', 'MONTHLY')",
          ),
          checkExpression(
            'loan_status_check_921c6596',
            "\"status\" IN ('PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'loanInstallment',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installmentNo', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('loanId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
            'loanInstallment_status_check_b0be9e9f',
            "\"status\" IN ('PENDING', 'PARTIAL', 'PAID')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'loanPayment',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('installmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('loanId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'loanPayment_paymentMethod_check_1ac18d5d',
            "\"paymentMethod\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHEQUE', 'OTHER')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'loan',
        constraint: 'loan_loanId_key',
        columns: ['loanId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'loanInstallment',
        constraint: 'loanInstallment_loanId_installmentNo_key',
        columns: ['loanId', 'installmentNo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'loanPayment',
        constraint: 'loanPayment_paymentId_key',
        columns: ['paymentId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'memberAddress',
        constraint: 'memberAddress_type_check_4dfe7b6a',
        expression: "\"type\" IN ('PRESENT', 'FATHER_HOME')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_loanId_idx_d4eddfc5',
        columns: ['loanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loan',
        index: 'loan_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanInstallment',
        index: 'loanInstallment_dueDate_idx_fb527616',
        columns: ['dueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanInstallment',
        index: 'loanInstallment_loanId_idx_d4eddfc5',
        columns: ['loanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanInstallment',
        index: 'loanInstallment_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanPayment',
        index: 'loanPayment_installmentId_idx_b38c685f',
        columns: ['installmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanPayment',
        index: 'loanPayment_loanId_idx_d4eddfc5',
        columns: ['loanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'loanPayment',
        index: 'loanPayment_paymentDate_idx_51c3a9f5',
        columns: ['paymentDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loan',
        foreignKey: {
          name: 'loan_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loanInstallment',
        foreignKey: {
          name: 'loanInstallment_loanId_fkey',
          columns: ['loanId'],
          references: { schema: 'public', table: 'loan', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loanPayment',
        foreignKey: {
          name: 'loanPayment_loanId_fkey',
          columns: ['loanId'],
          references: { schema: 'public', table: 'loan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'loanPayment',
        foreignKey: {
          name: 'loanPayment_installmentId_fkey',
          columns: ['installmentId'],
          references: { schema: 'public', table: 'loanInstallment', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
