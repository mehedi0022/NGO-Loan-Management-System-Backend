import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import { config } from "../../src/config/env.js";
import {
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/utils/jwt.util.js";

describe("JWT claim policy", () => {
  it("generates independently unique refresh tokens and jtis rapidly", () => {
    const issued = Array.from({ length: 500 }, () =>
      issueRefreshToken({ userId: 1 }),
    );

    expect(new Set(issued.map(({ token }) => token))).toHaveLength(500);
    expect(new Set(issued.map(({ jti }) => jti))).toHaveLength(500);
  });

  it("rejects expired refresh tokens", () => {
    const expired = jwt.sign(
      { typ: "refresh" },
      config.jwt.refreshSecret,
      {
        algorithm: "HS256",
        subject: "1",
        jwtid: randomUUID(),
        issuer: config.jwt.issuer,
        audience: config.jwt.refreshAudience,
        expiresIn: -1,
      },
    );

    expect(() => verifyRefreshToken(expired)).toThrow();
  });

  it("rejects missing, malformed, and wrong-type claims", () => {
    const missingJti = jwt.sign(
      { typ: "refresh" },
      config.jwt.refreshSecret,
      {
        algorithm: "HS256",
        subject: "1",
        issuer: config.jwt.issuer,
        audience: config.jwt.refreshAudience,
      },
    );
    const accessAsRefresh = jwt.sign(
      { typ: "access" },
      config.jwt.refreshSecret,
      {
        algorithm: "HS256",
        subject: "1",
        jwtid: randomUUID(),
        issuer: config.jwt.issuer,
        audience: config.jwt.refreshAudience,
      },
    );

    expect(() => verifyRefreshToken(missingJti)).toThrow();
    expect(() => verifyRefreshToken(accessAsRefresh)).toThrow();
  });

  it("does not accept a refresh token as an access token", () => {
    const { token } = issueRefreshToken({ userId: 1 });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("does not trust a role embedded in an access token", () => {
    const token = jwt.sign(
      { typ: "access", role: "SUPER_ADMIN" },
      config.jwt.accessSecret,
      {
        algorithm: "HS256",
        subject: "1",
        jwtid: randomUUID(),
        issuer: config.jwt.issuer,
        audience: config.jwt.accessAudience,
        expiresIn: "15m",
      },
    );
    expect(verifyAccessToken(token)).not.toHaveProperty("role");
  });
});
