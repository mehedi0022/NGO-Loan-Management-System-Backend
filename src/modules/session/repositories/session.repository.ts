import { Temporal } from "temporal-polyfill";

import { db } from "../../../prisma/db.js";

type CreateSessionData = {
  userId: number;
  jti: string;
  familyId: string;
  refreshTokenHash: string;
  expiresAt: Temporal.Instant;
  absoluteExpiresAt: Temporal.Instant;
  rememberMe: boolean;
};

type RotateSessionData = {
  userId: number;
  currentJti: string;
  currentTokenHash: string;
  replacementJti: string;
  replacementTokenHash: string;
  replacementExpiresAt: Temporal.Instant;
  now: Temporal.Instant;
};

export type RotateSessionResult =
  | {
      status: "rotated";
      userId: number;
      expiresAt: Temporal.Instant;
      rememberMe: boolean;
    }
  | { status: "invalid" }
  | { status: "replayed" };

export const createSession = async (data: CreateSessionData) => {
  return db.orm.public.Session.create(data);
};

export const findSessionByTokenHash = async (refreshTokenHash: string) =>
  db.orm.public.Session.first({ refreshTokenHash });

export const revokeSessionByTokenHash = async (
  refreshTokenHash: string,
  revokedAt: Temporal.Instant,
) => {
  const revoked = await db.orm.public.Session
    .where({ refreshTokenHash, revokedAt: null })
    .select("id")
    .update({ revokedAt });
  return revoked !== null;
};

export const revokeAllSessionsByUserId = async (
  userId: number,
  revokedAt: Temporal.Instant,
) => {
  let revokedCount = 0;
  while (
    await db.orm.public.Session
      .where({ userId, revokedAt: null })
      .select("id")
      .update({ revokedAt })
  ) revokedCount += 1;
  return revokedCount;
};

export const deleteExpiredAndOldRevokedSessions = async (
  now: Temporal.Instant,
  revokedBefore: Temporal.Instant,
) => {
  let deletedCount = 0;
  while (
    await db.orm.public.Session
      .where((session) => session.expiresAt.lte(now))
      .select("id")
      .delete()
  ) deletedCount += 1;
  while (
    await db.orm.public.Session
      .where((session) => session.absoluteExpiresAt.lte(now))
      .select("id")
      .delete()
  ) deletedCount += 1;
  while (
    await db.orm.public.Session
      .where((session) => session.revokedAt.lte(revokedBefore))
      .select("id")
      .delete()
  ) deletedCount += 1;
  return deletedCount;
};

/**
 * Consumes one refresh session and creates its successor in one transaction.
 * The conditional UPDATE is the concurrency gate: at most one request can
 * change an active row from unconsumed to consumed.
 */
export const rotateSession = async (
  data: RotateSessionData,
): Promise<RotateSessionResult> => db.transaction(async (tx) => {
  const current = await tx.orm.public.Session.first({
    refreshTokenHash: data.currentTokenHash,
  });

  if (
    !current
    || current.userId !== data.userId
    || current.jti !== data.currentJti
  ) {
    return { status: "invalid" };
  }

  const revokeActiveFamily = async () => {
    while (
      await tx.orm.public.Session
        .where({ familyId: current.familyId, revokedAt: null })
        .select("id")
        .update({ revokedAt: data.now })
    ) {
      // Prisma Next mutations return one row; exhaust every active lineage row.
    }
  };

  if (current.consumedAt) {
    await revokeActiveFamily();
    return { status: "replayed" };
  }

  if (
    current.revokedAt
    || Temporal.Instant.compare(current.expiresAt, data.now) <= 0
    || Temporal.Instant.compare(current.absoluteExpiresAt, data.now) <= 0
  ) {
    return { status: "invalid" };
  }

  const expiresAt =
    Temporal.Instant.compare(data.replacementExpiresAt, current.absoluteExpiresAt) > 0
      ? current.absoluteExpiresAt
      : data.replacementExpiresAt;

  if (Temporal.Instant.compare(expiresAt, data.now) <= 0) {
    return { status: "invalid" };
  }

  const consumed = await tx.orm.public.Session
    .where({
      id: current.id,
      refreshTokenHash: data.currentTokenHash,
      jti: data.currentJti,
      revokedAt: null,
      consumedAt: null,
    })
    .where((session) => session.expiresAt.gt(data.now))
    .where((session) => session.absoluteExpiresAt.gt(data.now))
    .select("id")
    .update({
      consumedAt: data.now,
      revokedAt: data.now,
      replacedByJti: data.replacementJti,
    });

  if (!consumed) {
    const latest = await tx.orm.public.Session.first({ id: current.id });

    if (latest?.consumedAt) {
      await revokeActiveFamily();
      return { status: "replayed" };
    }

    return { status: "invalid" };
  }

  await tx.orm.public.Session.create({
    userId: current.userId,
    jti: data.replacementJti,
    familyId: current.familyId,
    refreshTokenHash: data.replacementTokenHash,
    expiresAt,
    absoluteExpiresAt: current.absoluteExpiresAt,
    rememberMe: current.rememberMe,
  });

  return {
    status: "rotated",
    userId: current.userId,
    expiresAt,
    rememberMe: current.rememberMe,
  };
});
