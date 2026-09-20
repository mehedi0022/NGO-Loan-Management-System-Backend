import type { CookieOptions } from "express";

import { config } from "../config/env.js";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Access token cookie
 */
const accessTokenCookieBaseOptions: CookieOptions = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  domain: config.cookie.domain,
  path: "/",
};

export const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...accessTokenCookieBaseOptions,
  maxAge: ACCESS_TOKEN_MAX_AGE_MS,
});

export const accessTokenClearCookieOptions: CookieOptions =
  accessTokenCookieBaseOptions;

export const accessTokenCookieName = "accessToken";

/**
 * Refresh token cookie
 */
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

export const refreshTokenLegacyClearCookieOptions: CookieOptions = {
  ...refreshTokenCookieBaseOptions,
  path: "/",
};

export const refreshTokenCookieName = config.cookie.name;
