import argon2 from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as null | { id: number; email: string; fullName: string | null; password: string; emailVerifiedAt: string | null },
  replaceAccountToken: vi.fn(),
  consumePasswordReset: vi.fn(),
  consumeEmailVerification: vi.fn(),
  changePasswordAndRevokeSessions: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../../src/config/env.js", () => ({
  config: {
    smtp: { enabled: true },
    email: {
      appUrl: "https://app.example.test",
      brandName: "Express Starter",
      primaryColor: "#2563EB",
      logoUrl: undefined,
      supportEmail: undefined,
      footerText: undefined,
    },
    accountToken: { passwordResetTtlMs: 3_600_000, emailVerificationTtlMs: 86_400_000 },
  },
}));

vi.mock("../../src/modules/user/repositories/user.repository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) => state.user?.email === email ? state.user : null),
  findUserById: vi.fn(async (id: number) => state.user?.id === id ? { id, email: state.user.email } : null),
  createUser: vi.fn(),
}));

vi.mock("../../src/modules/auth/repositories/account-token.repository.js", () => ({
  replaceAccountToken: state.replaceAccountToken,
  consumePasswordReset: state.consumePasswordReset,
  consumeEmailVerification: state.consumeEmailVerification,
  changePasswordAndRevokeSessions: state.changePasswordAndRevokeSessions,
}));

vi.mock("../../src/modules/email/email.service.js", () => ({ emailService: { sendEmail: state.sendEmail } }));
vi.mock("../../src/modules/session/services/session.service.js", () => ({}));

const authService = await import("../../src/modules/auth/services/auth.service.js");
const { verifyEmailSchema } = await import("../../src/modules/auth/validations/auth.validation.js");

beforeEach(async () => {
  state.user = {
    id: 7,
    email: "member@example.test",
    fullName: "Member",
    password: await argon2.hash("Password1!"),
    emailVerifiedAt: null,
  };
  state.replaceAccountToken.mockReset().mockResolvedValue({ id: 1 });
  state.consumePasswordReset.mockReset();
  state.consumeEmailVerification.mockReset();
  state.changePasswordAndRevokeSessions.mockReset().mockResolvedValue(true);
  state.sendEmail.mockReset().mockResolvedValue({ messageId: "test-message" });
});

describe("account lifecycle service", () => {
  it("does not issue a reset token for an unknown email", async () => {
    await authService.forgotPassword({ email: "unknown@example.test" });
    expect(state.replaceAccountToken).not.toHaveBeenCalled();
    expect(state.sendEmail).not.toHaveBeenCalled();
  });

  it("stores only a hash before sending a password-reset email", async () => {
    await authService.forgotPassword({ email: "member@example.test" });

    expect(state.replaceAccountToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      type: "PASSWORD_RESET",
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(state.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "member@example.test" }));
  });

  it("rejects expired, reused, or otherwise invalid reset tokens", async () => {
    state.consumePasswordReset.mockResolvedValue(null);
    await expect(authService.resetPassword({ token: "invalid", password: "NewPassword1!" }))
      .rejects.toThrow("Invalid or expired reset token");
  });

  it("resets a password through the atomic consume-and-revoke operation", async () => {
    state.consumePasswordReset.mockResolvedValue(7);
    await authService.resetPassword({ token: "one-time-token", password: "NewPassword1!" });
    expect(state.consumePasswordReset).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      passwordHash: expect.not.stringMatching(/^NewPassword1!$/),
    }));
  });

  it("requires the current password and rejects a same-password change", async () => {
    await expect(authService.changePassword(7, { currentPassword: "WrongPassword1!", newPassword: "NewPassword1!" }))
      .rejects.toThrow("Current password is incorrect");
    await expect(authService.changePassword(7, { currentPassword: "Password1!", newPassword: "Password1!" }))
      .rejects.toThrow("New password must be different");
  });

  it("changes the password via the operation that revokes active sessions", async () => {
    await authService.changePassword(7, { currentPassword: "Password1!", newPassword: "NewPassword1!" });
    expect(state.changePasswordAndRevokeSessions).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      passwordHash: expect.stringMatching(/^\$argon2/),
    }));
  });

  it("consumes an email-verification token once", async () => {
    state.consumeEmailVerification.mockResolvedValue(7);
    await authService.verifyEmail("verification-token");
    expect(state.consumeEmailVerification).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));

    state.consumeEmailVerification.mockResolvedValue(null);
    await expect(authService.verifyEmail("verification-token")).rejects.toThrow("Invalid or expired verification token");
  });

  it("does not resend verification for an already verified account", async () => {
    state.user.emailVerifiedAt = "2026-09-07T00:00:00Z";
    await authService.resendVerification("member@example.test");
    expect(state.replaceAccountToken).not.toHaveBeenCalled();
  });

  it("accepts a token-only email-verification request", () => {
    expect(verifyEmailSchema.safeParse({ body: { token: "verification-token" } }).success).toBe(true);
    expect(verifyEmailSchema.safeParse({ body: {} }).success).toBe(false);
  });
});
