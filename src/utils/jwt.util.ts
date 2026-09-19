import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { config } from "../config/env.js";

const algorithm: jwt.Algorithm = "HS256";
const subjectSchema = z.string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647));

const accessClaimsSchema = z.object({
  sub: subjectSchema,
  jti: z.string().uuid(),
  typ: z.literal("access"),
});

const refreshClaimsSchema = z.object({
  sub: subjectSchema,
  jti: z.string().uuid(),
  typ: z.literal("refresh"),
});

export type TokenPayload = { userId: number };
export type RefreshTokenClaims = { userId: number; jti: string; type: "refresh" };

const signToken = (
  userId: number,
  type: "access" | "refresh",
  jti: string,
  refreshExpiresInMs?: number,
) => jwt.sign(
  { typ: type },
  type === "access" ? config.jwt.accessSecret : config.jwt.refreshSecret,
  {
    algorithm,
    subject: String(userId),
    jwtid: jti,
    issuer: config.jwt.issuer,
    audience: type === "access"
      ? config.jwt.accessAudience
      : config.jwt.refreshAudience,
    expiresIn: (type === "access"
      ? config.jwt.accessExpiresIn
      : `${refreshExpiresInMs ?? config.session.idleTtlMs}ms`) as jwt.SignOptions["expiresIn"],
  },
);

export const signAccessToken = ({ userId }: TokenPayload) =>
  signToken(userId, "access", randomUUID());

export const issueRefreshToken = (
  { userId }: TokenPayload,
  expiresInMs = config.session.idleTtlMs,
) => {
  const jti = randomUUID();
  return { token: signToken(userId, "refresh", jti, expiresInMs), jti };
};

export const verifyAccessToken = (token: string) => {
  const decoded = jwt.verify(token, config.jwt.accessSecret, {
    algorithms: [algorithm],
    issuer: config.jwt.issuer,
    audience: config.jwt.accessAudience,
  });
  const claims = accessClaimsSchema.parse(decoded);
  return {
    userId: claims.sub,
    jti: claims.jti,
    type: claims.typ,
  } as const;
};

export const verifyRefreshToken = (token: string): RefreshTokenClaims => {
  const decoded = jwt.verify(token, config.jwt.refreshSecret, {
    algorithms: [algorithm],
    issuer: config.jwt.issuer,
    audience: config.jwt.refreshAudience,
  });
  const claims = refreshClaimsSchema.parse(decoded);
  return { userId: claims.sub, jti: claims.jti, type: claims.typ };
};
