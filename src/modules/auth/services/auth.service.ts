import {
  AuthenticationError,
  ConflictError,
} from "../../../errors/AppError.js";
import { hashPassword, verifyPassword } from "../../../utils/password.util.js";
import { Temporal } from "temporal-polyfill";
import { millisecondsUntil } from "../../../config/session-policy.js";
import {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from "../../../utils/jwt.util.js";
import { randomUUID } from "node:crypto";
import { config } from "../../../config/env.js";
import { generateSecureToken, hashToken } from "../../../utils/token.util.js";
import { emailService } from "../../email/email.service.js";
import { createPasswordResetEmail } from "../../email/templates/password-reset.template.js";
import { createVerificationEmail } from "../../email/templates/verification.template.js";
import * as accountTokenRepository from "../repositories/account-token.repository.js";

import * as userRepository from "../../user/repositories/user.repository.js";
import { toPublicUserDto } from "../../user/user.dto.js";
import * as sessionService from "../../session/services/session.service.js";

import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "../auth.types.js";

const accountTokenUrl = (path: string, token: string) => `${config.email.appUrl!.replace(/\/$/, "")}${path}?token=${encodeURIComponent(token)}`;

const issueAccountToken = async (user: { id: number; email: string; fullName: string | null }, type: accountTokenRepository.AccountTokenType) => {
  if (!config.smtp.enabled) return;
  const token = generateSecureToken();
  const now = Temporal.Now.instant();
  const expiresAt = now.add({ milliseconds: type === "PASSWORD_RESET" ? config.accountToken.passwordResetTtlMs : config.accountToken.emailVerificationTtlMs });
  await accountTokenRepository.replaceAccountToken({ userId: user.id, type, tokenHash: hashToken(token), expiresAt });
  const template = type === "PASSWORD_RESET"
    ? createPasswordResetEmail({ resetUrl: accountTokenUrl("/reset-password", token), recipientName: user.fullName ?? undefined })
    : createVerificationEmail({ verificationUrl: accountTokenUrl("/verify-email", token), recipientName: user.fullName ?? undefined });
  await emailService.sendEmail({ to: user.email, ...template });
};

export const register = async (data: RegisterInput) => {
  const existingUser = await userRepository.findUserByEmail(data.email);

  if (existingUser) {
    throw new ConflictError("User already exists with this email");
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await userRepository.createUser({
    ...data,
    password: hashedPassword,
  });

  await issueAccountToken(user, "EMAIL_VERIFICATION");

  return user;
};

export const login = async (data: LoginInput) => {
  const user = await userRepository.findUserByEmail(data.email);

  if (!user) {
    throw new AuthenticationError("Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(user.password, data.password);

  if (!isPasswordValid) {
    throw new AuthenticationError("Invalid email or password");
  }

  const now = Temporal.Now.instant();
  const window = sessionService.getNextSessionWindow(now, data.rememberMe);
  const refresh = issueRefreshToken(
    { userId: user.id },
    millisecondsUntil(window.expiresAt, now),
  );
  const accessToken = signAccessToken({ userId: user.id });

  await sessionService.createRefreshSession({
    userId: user.id,
    jti: refresh.jti,
    familyId: randomUUID(),
    refreshToken: refresh.token,
    expiresAt: window.expiresAt,
    absoluteExpiresAt: window.absoluteExpiresAt,
    rememberMe: data.rememberMe,
  });

  return {
    user: toPublicUserDto(user),
    accessToken,
    refreshToken: refresh.token,
    refreshExpiresAt: window.expiresAt,
    rememberMe: data.rememberMe,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const currentSession = await sessionService.getRefreshSession(refreshToken);

  if (
    !currentSession
    || currentSession.userId !== payload.userId
    || currentSession.jti !== payload.jti
  ) {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const now = Temporal.Now.instant();
  if (Temporal.Instant.compare(currentSession.absoluteExpiresAt, now) <= 0) {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const window = sessionService.getNextSessionWindow(
    now,
    currentSession.rememberMe,
    currentSession.absoluteExpiresAt,
  );
  const replacement = issueRefreshToken(
    { userId: payload.userId },
    millisecondsUntil(window.expiresAt, now),
  );

  const rotation = await sessionService.rotateRefreshSession({
    userId: payload.userId,
    currentJti: payload.jti,
    currentRefreshToken: refreshToken,
    replacementJti: replacement.jti,
    replacementRefreshToken: replacement.token,
    replacementExpiresAt: window.expiresAt,
  });

  if (rotation.status !== "rotated") {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const newAccessToken = signAccessToken({ userId: rotation.userId });

  return {
    accessToken: newAccessToken,
    refreshToken: replacement.token,
    refreshExpiresAt: rotation.expiresAt,
    rememberMe: rotation.rememberMe,
  };
};

export const logout = async (refreshToken?: string) => {
  if (!refreshToken) return false;
  return sessionService.revokeRefreshSession(refreshToken);
};

/** Revokes every refresh session for the user, including the current one. */
export const logoutAll = async (userId: number) =>
  sessionService.revokeAllUserSessions(userId);

export const forgotPassword = async (data: ForgotPasswordInput) => {
  const user = await userRepository.findUserByEmail(data.email);
  if (user) await issueAccountToken(user, "PASSWORD_RESET");
};

export const resetPassword = async (data: ResetPasswordInput) => {
  const userId = await accountTokenRepository.consumePasswordReset({ tokenHash: hashToken(data.token), passwordHash: await hashPassword(data.password), now: Temporal.Now.instant() });
  if (!userId) throw new AuthenticationError("Invalid or expired reset token");
};

export const changePassword = async (userId: number, data: ChangePasswordInput) => {
  const user = await userRepository.findUserByEmail((await userRepository.findUserById(userId))?.email ?? "");
  if (!user || !await verifyPassword(user.password, data.currentPassword)) throw new AuthenticationError("Current password is incorrect");
  if (await verifyPassword(user.password, data.newPassword)) throw new ConflictError("New password must be different from the current password");
  await accountTokenRepository.changePasswordAndRevokeSessions({ userId, passwordHash: await hashPassword(data.newPassword), now: Temporal.Now.instant() });
};

export const resendVerification = async (email: string) => {
  const user = await userRepository.findUserByEmail(email);
  if (user && !user.emailVerifiedAt) await issueAccountToken(user, "EMAIL_VERIFICATION");
};

export const verifyEmail = async (token: string) => {
  const userId = await accountTokenRepository.consumeEmailVerification({ tokenHash: hashToken(token), now: Temporal.Now.instant() });
  if (!userId) throw new AuthenticationError("Invalid or expired verification token");
};
