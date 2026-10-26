#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/745e5d9c748a2d6f36a077401f335429a887c1877f5f79fbfdce91d564514a87/contract';
import startContract from '../../snapshots/745e5d9c748a2d6f36a077401f335429a887c1877f5f79fbfdce91d564514a87/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b900b0724b652578e11ba114916c8d0436bad6d52ef689cccce2d37f2d3a670b/contract';
import endContract from '../../snapshots/b900b0724b652578e11ba114916c8d0436bad6d52ef689cccce2d37f2d3a670b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
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
        table: 'organizationSetting',
        columns: [
          col('address', 'text', {
            default: lit('Main Road, Branch Office, Bangladesh'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('currencyCode', 'text', {
            notNull: true,
            default: lit('BDT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('currencySymbol', 'text', {
            notNull: true,
            default: lit('৳'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('defaultGraceDays', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('defaultLoanChargeType', 'text', {
            notNull: true,
            default: lit('PERCENTAGE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('defaultLoanChargeValue', 'numeric', {
            notNull: true,
            default: lit('10'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('defaultLoanFrequency', 'text', {
            notNull: true,
            default: lit('WEEKLY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('email', 'text', {
            default: lit('info@purbasha.org'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('establishedYear', 'text', {
            default: lit('2018'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('latePenaltyPercentage', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('logoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('minGeneralSavingsDeposit', 'numeric', {
            notNull: true,
            default: lit('50'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('minSpecialSavingsDeposit', 'numeric', {
            notNull: true,
            default: lit('100'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('orgName', 'text', {
            notNull: true,
            default: lit('Purbasha Financial Development Organization'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('orgShortName', 'text', { default: lit('PFDO'), codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', {
            default: lit('+8801700000000'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('registrationNo', 'text', {
            default: lit('REG-NGO-2024-001'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'organizationSetting_defaultLoanChargeType_check_5a68d180',
            "\"defaultLoanChargeType\" IN ('FLAT', 'PERCENTAGE')",
          ),
          checkExpression(
            'organizationSetting_defaultLoanFrequency_check_1812a53a',
            "\"defaultLoanFrequency\" IN ('WEEKLY', 'MONTHLY')",
          ),
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
