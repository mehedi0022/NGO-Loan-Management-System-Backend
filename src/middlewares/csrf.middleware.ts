import type { RequestHandler } from "express";

import { config } from "../config/env.js";
import { AuthorizationError } from "../errors/AppError.js";
import { refreshTokenCookieName } from "../utils/cookie.util.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const trustedOrigins = new Set(config.csrf.trustedOrigins);

const headerOrigin = (value?: string) => {
  if (!value || value === "null") return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Protects cookie-authenticated mutations. SameSite is the first browser
 * boundary; exact Origin/Referer validation is the independent server-side
 * boundary. Requests without cookies remain available to non-browser clients.
 */
export const protectCookieAuthFromCsrf: RequestHandler = (req, _res, next) => {
  if (safeMethods.has(req.method)) return next();

  const originHeader = req.get("origin");
  const refererHeader = req.get("referer");
  const suppliedSource = originHeader ?? refererHeader;
  const sourceOrigin = headerOrigin(suppliedSource);

  if (suppliedSource) {
    return sourceOrigin && trustedOrigins.has(sourceOrigin)
      ? next()
      : next(new AuthorizationError("Untrusted request origin"));
  }

  if (req.cookies?.[refreshTokenCookieName]) {
    return next(new AuthorizationError("Request origin is required"));
  }

  return next();
};
