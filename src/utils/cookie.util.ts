import type { CookieOptions } from "express";

import { config } from "../config/env.js";

const refreshTokenCookieBaseOptions: CookieOptions = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  domain: config.cookie.domain,
  path: config.cookie.path,
};

export const getRefreshTokenCookieOptions = (
  rememberMe: boolean,
  maxAgeMs: number,
): CookieOptions => ({
  ...refreshTokenCookieBaseOptions,
  ...(rememberMe ? { maxAge: maxAgeMs } : {}),
});

export const refreshTokenClearCookieOptions: CookieOptions =
  refreshTokenCookieBaseOptions;

// Clear cookies issued by starter versions that used Path=/ before the
// narrower auth-only default was introduced.
export const refreshTokenLegacyClearCookieOptions: CookieOptions = {
  ...refreshTokenCookieBaseOptions,
  path: "/",
};

export const refreshTokenCookieName = config.cookie.name;
