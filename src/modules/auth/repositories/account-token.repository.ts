import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";

export type AccountTokenType = "PASSWORD_RESET" | "EMAIL_VERIFICATION";

export const replaceAccountToken = async (data: {
  userId: number;
  type: AccountTokenType;
  tokenHash: string;
  expiresAt: Temporal.Instant;
}) => db.transaction(async (tx) => {
  while (await tx.orm.public.AccountToken.where({ userId: data.userId, type: data.type }).select("id").delete()) {
    // Keep only the newest token for a purpose, making resend links invalid immediately.
  }
  return tx.orm.public.AccountToken.create(data);
});

export const consumePasswordReset = async (data: {
  tokenHash: string;
  passwordHash: string;
  now: Temporal.Instant;
}) => db.transaction(async (tx) => {
  const token = await tx.orm.public.AccountToken.first({ tokenHash: data.tokenHash });
  if (!token || token.type !== "PASSWORD_RESET" || token.consumedAt || Temporal.Instant.compare(token.expiresAt, data.now) <= 0) return null;
  const consumed = await tx.orm.public.AccountToken
    .where({ id: token.id, consumedAt: null })
    .where((item) => item.expiresAt.gt(data.now))
    .select("id")
    .update({ consumedAt: data.now });
  if (!consumed) return null;
  await tx.orm.public.User.where({ id: token.userId }).select("id").update({ password: data.passwordHash });
  while (await tx.orm.public.Session.where({ userId: token.userId, revokedAt: null }).select("id").update({ revokedAt: data.now })) {}
  return token.userId;
});

export const consumeEmailVerification = async (data: { tokenHash: string; now: Temporal.Instant }) => db.transaction(async (tx) => {
  const token = await tx.orm.public.AccountToken.first({ tokenHash: data.tokenHash });
  if (!token || token.type !== "EMAIL_VERIFICATION" || token.consumedAt || Temporal.Instant.compare(token.expiresAt, data.now) <= 0) return null;
  const consumed = await tx.orm.public.AccountToken.where({ id: token.id, consumedAt: null }).where((item) => item.expiresAt.gt(data.now)).select("id").update({ consumedAt: data.now });
  if (!consumed) return null;
  await tx.orm.public.User.where({ id: token.userId }).select("id").update({ emailVerifiedAt: data.now });
  return token.userId;
});

export const changePasswordAndRevokeSessions = async (data: {
  userId: number;
  passwordHash: string;
  now: Temporal.Instant;
}) => db.transaction(async (tx) => {
  const updated = await tx.orm.public.User.where({ id: data.userId }).select("id").update({ password: data.passwordHash });
  if (!updated) return false;
  while (await tx.orm.public.Session.where({ userId: data.userId, revokedAt: null }).select("id").update({ revokedAt: data.now })) {}
  return true;
});
