import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/jwt.util.js", () => ({
  verifyAccessToken: vi.fn(() => ({
    userId: 7,
    jti: "00000000-0000-4000-8000-000000000000",
    type: "access",
  })),
}));

vi.mock("../../src/modules/user/repositories/user.repository.js", () => ({
  findAuthorizationUserById: vi.fn(),
}));

import { accessTokenCookieName } from "../../src/utils/cookie.util.js";
import { authenticate } from "../../src/middlewares/auth.middleware.js";
import { findAuthorizationUserById } from "../../src/modules/user/repositories/user.repository.js";

const findAuthorizationUser = vi.mocked(findAuthorizationUserById);

describe("authentication middleware user status", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects an inactive user even when the access token is valid", async () => {
    findAuthorizationUser.mockResolvedValue({
      id: 7,
      role: "MANAGER",
      isActive: false,
    });
    const request = {
      cookies: { [accessTokenCookieName]: "valid-access-token" },
    } as never;
    const next = vi.fn();

    await authenticate(request, {} as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      code: "AUTHENTICATION_ERROR",
      message: "Account is inactive",
    });
    expect(request).not.toHaveProperty("auth");
  });

  it("attaches active user identity to the request", async () => {
    findAuthorizationUser.mockResolvedValue({
      id: 7,
      role: "MANAGER",
      isActive: true,
    });
    const request = {
      cookies: { [accessTokenCookieName]: "valid-access-token" },
    } as { cookies: Record<string, string>; auth?: unknown };
    const next = vi.fn();

    await authenticate(request as never, {} as never, next);

    expect(request.auth).toEqual({ userId: 7, role: "MANAGER" });
    expect(next).toHaveBeenCalledWith();
  });
});
