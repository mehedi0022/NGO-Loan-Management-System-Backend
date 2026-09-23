#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1af527ba56404b48cbc785f0b32e2758591ed8bc41145e3a7ead18324a4446b5/contract';
import endContract from '../../snapshots/1af527ba56404b48cbc785f0b32e2758591ed8bc41145e3a7ead18324a4446b5/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
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
      this.createTable({
        schema: 'public',
        table: 'collection',
        columns: [
          col('collectedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('collectionDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('collectionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'collection_paymentMethod_check_1ac18d5d',
            "\"paymentMethod\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHEQUE', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'guarantor',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('division', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fatherName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('houseOrHolding', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mobileNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('motherName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nidNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('occupation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postOffice', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('relationship', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('road', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('union', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('village', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
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
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('approvedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
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
          col('rejectedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('rejectedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('collectionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
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
      this.createTable({
        schema: 'public',
        table: 'member',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fatherName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('guardianName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('memberId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('mobileNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('motherName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nidNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('occupation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('photoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
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
            'member_status_check_a34ffd8e',
            "\"status\" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'memberAddress',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('division', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('houseOrHolding', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('postOffice', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('road', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('union', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('village', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'memberAddress_type_check_4dfe7b6a',
            "\"type\" IN ('PRESENT', 'FATHER_HOME')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'savingsAccount',
        columns: [
          col('accountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('generalSavingsBalance', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('memberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('openedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('specialSavingsBalance', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
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
            'savingsAccount_status_check_f94a3a5d',
            "\"status\" IN ('ACTIVE', 'CLOSED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'savingsTransaction',
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
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethod', 'text', {
            notNull: true,
            default: lit('CASH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('savingsAccountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('savingsType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
            'savingsTransaction_paymentMethod_check_1ac18d5d',
            "\"paymentMethod\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CHEQUE', 'OTHER')",
          ),
          checkExpression(
            'savingsTransaction_savingsType_check_5a4888a3',
            "\"savingsType\" IN ('GENERAL', 'SPECIAL')",
          ),
          checkExpression(
            'savingsTransaction_type_check_e2220677',
            "\"type\" IN ('DEPOSIT', 'WITHDRAWAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('absoluteExpiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
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
          col('familyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('jti', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('refreshTokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rememberMe', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('replacedByJti', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailVerifiedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fullName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('MANAGER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_25d457a5',
            "\"role\" IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'accountToken',
        constraint: 'accountToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'collection',
        constraint: 'collection_collectionId_key',
        columns: ['collectionId'],
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
      this.addUnique({
        schema: 'public',
        table: 'member',
        constraint: 'member_memberId_key',
        columns: ['memberId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'member',
        constraint: 'member_nidNumber_key',
        columns: ['nidNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'memberAddress',
        constraint: 'memberAddress_memberId_type_key',
        columns: ['memberId', 'type'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'savingsAccount',
        constraint: 'savingsAccount_accountId_key',
        columns: ['accountId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'savingsAccount',
        constraint: 'savingsAccount_memberId_key',
        columns: ['memberId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'savingsTransaction',
        constraint: 'savingsTransaction_transactionId_key',
        columns: ['transactionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'session',
        constraint: 'session_jti_key',
        columns: ['jti'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'session',
        constraint: 'session_refreshTokenHash_key',
        columns: ['refreshTokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
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
      this.createIndex({
        schema: 'public',
        table: 'collection',
        index: 'collection_collectedById_idx_e043e5df',
        columns: ['collectedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'collection',
        index: 'collection_collectionDate_idx_79668a7e',
        columns: ['collectionDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'collection',
        index: 'collection_collectionId_idx_b344fc1a',
        columns: ['collectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'collection',
        index: 'collection_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guarantor',
        index: 'guarantor_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guarantor',
        index: 'guarantor_mobileNumber_idx_5f22dea3',
        columns: ['mobileNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guarantor',
        index: 'guarantor_nidNumber_idx_54ca31cd',
        columns: ['nidNumber'],
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
        index: 'loan_rejectedById_idx_a6ee2717',
        columns: ['rejectedById'],
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
        index: 'loanPayment_collectionId_idx_b344fc1a',
        columns: ['collectionId'],
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
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_fullName_idx_08c13ff8',
        columns: ['fullName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_mobileNumber_idx_5f22dea3',
        columns: ['mobileNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberAddress',
        index: 'memberAddress_district_idx_1728c727',
        columns: ['district'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberAddress',
        index: 'memberAddress_memberId_idx_76b3c263',
        columns: ['memberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memberAddress',
        index: 'memberAddress_upazila_idx_d1e4cc72',
        columns: ['upazila'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsAccount',
        index: 'savingsAccount_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsAccount',
        index: 'savingsAccount_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_collectionId_idx_b344fc1a',
        columns: ['collectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_savingsAccountId_idx_ff57156a',
        columns: ['savingsAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_savingsType_idx_dc620691',
        columns: ['savingsType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_transactionDate_idx_b449edf8',
        columns: ['transactionDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'savingsTransaction',
        index: 'savingsTransaction_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_userId_idx_a489d58a',
        columns: ['userId'],
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
      this.addForeignKey({
        schema: 'public',
        table: 'collection',
        foreignKey: {
          name: 'collection_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'collection',
        foreignKey: {
          name: 'collection_collectedById_fkey',
          columns: ['collectedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'guarantor',
        foreignKey: {
          name: 'guarantor_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
          onDelete: 'cascade',
        },
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
      this.addForeignKey({
        schema: 'public',
        table: 'loanPayment',
        foreignKey: {
          name: 'loanPayment_collectionId_fkey',
          columns: ['collectionId'],
          references: { schema: 'public', table: 'collection', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memberAddress',
        foreignKey: {
          name: 'memberAddress_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'savingsAccount',
        foreignKey: {
          name: 'savingsAccount_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'member', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'savingsTransaction',
        foreignKey: {
          name: 'savingsTransaction_savingsAccountId_fkey',
          columns: ['savingsAccountId'],
          references: { schema: 'public', table: 'savingsAccount', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'savingsTransaction',
        foreignKey: {
          name: 'savingsTransaction_collectionId_fkey',
          columns: ['collectionId'],
          references: { schema: 'public', table: 'collection', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
