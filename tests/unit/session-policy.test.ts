import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { config } from "../../src/config/env.js";
import { getSessionWindow } from "../../src/config/session-policy.js";
import { getRefreshTokenCookieOptions } from "../../src/utils/cookie.util.js";

describe("central session expiry policy", () => {
  const now = Temporal.Instant.from("2026-01-01T00:00:00Z");

  it("uses the short idle lifetime when rememberMe is false", () => {
    const window = getSessionWindow(now, false);
    expect(window.expiresAt.epochMilliseconds - now.epochMilliseconds)
      .toBe(config.session.idleTtlMs);
    expect(getRefreshTokenCookieOptions(false, config.session.idleTtlMs))
      .not.toHaveProperty("maxAge");
    expect(getRefreshTokenCookieOptions(false, config.session.idleTtlMs))
      .toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/api/v1/auth",
      });
  });

  it("uses a persistent cookie and longer idle lifetime for rememberMe", () => {
    const window = getSessionWindow(now, true);
    expect(window.expiresAt.epochMilliseconds - now.epochMilliseconds)
      .toBe(config.session.rememberMeIdleTtlMs);
    expect(
      getRefreshTokenCookieOptions(true, config.session.rememberMeIdleTtlMs),
    ).toHaveProperty("maxAge", config.session.rememberMeIdleTtlMs);
  });

  it("caps sliding renewal at the existing absolute expiry", () => {
    const absoluteExpiresAt = now.add({ minutes: 30 });
    const window = getSessionWindow(now, true, absoluteExpiresAt);
    expect(window.expiresAt.equals(absoluteExpiresAt)).toBe(true);
    expect(window.absoluteExpiresAt.equals(absoluteExpiresAt)).toBe(true);
  });
});
