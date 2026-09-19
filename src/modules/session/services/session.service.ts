import { Temporal } from "temporal-polyfill";

import {
  getRevokedSessionCutoff,
  getSessionWindow,
} from "../../../config/session-policy.js";
import { hashToken } from "../../../utils/token.util.js";
import * as sessionRepository from "../repositories/session.repository.js";

type CreateRefreshSessionInput = {
  userId: number;
  jti: string;
  familyId: string;
  refreshToken: string;
  expiresAt: Temporal.Instant;
  absoluteExpiresAt: Temporal.Instant;
  rememberMe: boolean;
};

type RotateRefreshSessionInput = {
  userId: number;
  currentJti: string;
  currentRefreshToken: string;
  replacementJti: string;
  replacementRefreshToken: string;
  replacementExpiresAt: Temporal.Instant;
};

export const createRefreshSession = async (data: CreateRefreshSessionInput) =>
  sessionRepository.createSession({
    userId: data.userId,
    jti: data.jti,
    familyId: data.familyId,
    refreshTokenHash: hashToken(data.refreshToken),
    expiresAt: data.expiresAt,
    absoluteExpiresAt: data.absoluteExpiresAt,
    rememberMe: data.rememberMe,
  });

export const getRefreshSession = async (refreshToken: string) =>
  sessionRepository.findSessionByTokenHash(hashToken(refreshToken));

export const rotateRefreshSession = async (data: RotateRefreshSessionInput) =>
  sessionRepository.rotateSession({
    userId: data.userId,
    currentJti: data.currentJti,
    currentTokenHash: hashToken(data.currentRefreshToken),
    replacementJti: data.replacementJti,
    replacementTokenHash: hashToken(data.replacementRefreshToken),
    replacementExpiresAt: data.replacementExpiresAt,
    now: Temporal.Now.instant(),
  });

export const revokeRefreshSession = async (refreshToken: string) =>
  sessionRepository.revokeSessionByTokenHash(
    hashToken(refreshToken),
    Temporal.Now.instant(),
  );

export const revokeAllUserSessions = async (userId: number) =>
  sessionRepository.revokeAllSessionsByUserId(
    userId,
    Temporal.Now.instant(),
  );

export const cleanupSessions = async (now = Temporal.Now.instant()) =>
  sessionRepository.deleteExpiredAndOldRevokedSessions(
    now,
    getRevokedSessionCutoff(now),
  );

export const getNextSessionWindow = (
  now: Temporal.Instant,
  rememberMe: boolean,
  absoluteExpiresAt?: Temporal.Instant,
) => getSessionWindow(now, rememberMe, absoluteExpiresAt);
