#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract';
import endContract from '../../snapshots/cacf658175a4532f52aeddb460cff22720dab21913225ecf5c3c4d7cc2d554ef/contract.json' with { type: 'json' };
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
            'memberAddress_type_check_60c1240d',
            "\"type\" IN ('PRESENT', 'PERMANENT')",
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
