import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/jwt.util.js", () => ({
  verifyRefreshToken: vi.fn(() => ({
    userId: 7,
    jti: "00000000-0000-4000-8000-000000000001",
    type: "refresh",
  })),
  issueRefreshToken: vi.fn(),
  signAccessToken: vi.fn(),
}));

vi.mock("../../src/modules/user/repositories/user.repository.js", () => ({
  findAuthorizationUserById: vi.fn(async () => ({
    id: 7,
    role: "MANAGER",
    isActive: false,
  })),
}));

const sessionMocks = vi.hoisted(() => ({
  getRefreshSession: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  rotateRefreshSession: vi.fn(),
}));

vi.mock("../../src/modules/session/services/session.service.js", () => ({
  ...sessionMocks,
}));

import { refreshAccessToken } from "../../src/modules/auth/services/auth.service.js";

describe("refresh authentication user status", () => {
  it("revokes sessions and rejects refresh for an inactive user", async () => {
    sessionMocks.getRefreshSession.mockResolvedValue({
      id: 1,
      userId: 7,
      jti: "00000000-0000-4000-8000-000000000001",
      familyId: "00000000-0000-4000-8000-000000000002",
      refreshTokenHash: "hash",
      expiresAt: Temporal.Now.instant().add({ hours: 1 }),
      absoluteExpiresAt: Temporal.Now.instant().add({ hours: 2 }),
      rememberMe: false,
      revokedAt: null,
      consumedAt: null,
      replacedByJti: null,
      createdAt: Temporal.Now.instant(),
    });
    sessionMocks.revokeAllUserSessions.mockResolvedValue(1);

    await expect(refreshAccessToken("refresh-token")).rejects.toThrow(
      "Invalid or expired refresh token",
    );

    expect(sessionMocks.revokeAllUserSessions).toHaveBeenCalledWith(7);
    expect(sessionMocks.rotateRefreshSession).not.toHaveBeenCalled();
  });
});
