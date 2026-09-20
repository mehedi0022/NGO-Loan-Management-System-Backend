import type { Request, Response } from "express";

import { AuthenticationError } from "../../../errors/AppError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

import {
  accessTokenClearCookieOptions,
  accessTokenCookieName,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  refreshTokenClearCookieOptions,
  refreshTokenCookieName,
  refreshTokenLegacyClearCookieOptions,
} from "../../../utils/cookie.util.js";

import { millisecondsUntil } from "../../../config/session-policy.js";

import * as authService from "../services/auth.service.js";

/**
 * Set access token cookie
 *
 * Access token:
 * - httpOnly
 * - available to all API routes
 * - expires after 15 minutes
 */
const setAccessCookie = (res: Response, accessToken: string) => {
  res.cookie(accessTokenCookieName, accessToken, getAccessTokenCookieOptions());
};

/**
 * Set refresh token cookie
 *
 * Refresh token lifetime depends on:
 * - rememberMe
 * - session idle TTL
 * - absolute session TTL
 */
const setRefreshCookie = (
  res: Response,
  result: {
    refreshToken: string;
    refreshExpiresAt: Parameters<typeof millisecondsUntil>[0];
    rememberMe: boolean;
  },
) => {
  res.cookie(
    refreshTokenCookieName,
    result.refreshToken,
    getRefreshTokenCookieOptions(
      result.rememberMe,
      millisecondsUntil(result.refreshExpiresAt),
    ),
  );
};

/**
 * Clear access token cookie
 */
const clearAccessCookie = (res: Response) => {
  res.clearCookie(accessTokenCookieName, accessTokenClearCookieOptions);
};

/**
 * Clear refresh token cookie
 */
const clearRefreshCookie = (res: Response) => {
  res.clearCookie(refreshTokenCookieName, refreshTokenClearCookieOptions);

  // Clear legacy refresh cookies that used Path=/
  if (refreshTokenClearCookieOptions.path !== "/") {
    res.clearCookie(
      refreshTokenCookieName,
      refreshTokenLegacyClearCookieOptions,
    );
  }
};

/**
 * Clear all authentication cookies
 */
const clearAuthCookies = (res: Response) => {
  clearAccessCookie(res);
  clearRefreshCookie(res);
};

/**
 * Login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  setAccessCookie(res, result.accessToken);
  setRefreshCookie(res, result);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
    },
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const oldRefreshToken = req.cookies?.[refreshTokenCookieName];

    if (!oldRefreshToken) {
      throw new AuthenticationError("Refresh token not found");
    }

    const result = await authService.refreshAccessToken(oldRefreshToken);

    // Set new access token
    setAccessCookie(res, result.accessToken);

    // Refresh token rotation
    setRefreshCookie(res, result);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  },
);

/**
 * Logout current session
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[refreshTokenCookieName]);

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * Logout all sessions
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.auth!.userId);

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out from all sessions",
  });
});

/**
 * Forgot password
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);

    res.status(202).json({
      success: true,
      message: "If the account exists, a password reset email has been sent",
    });
  },
);

/**
 * Reset password
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please sign in again.",
    });
  },
);

/**
 * Change password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.changePassword(req.auth!.userId, req.body);

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
    });
  },
);

/**
 * Resend email verification
 */
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.resendVerification(req.body.email);

    res.status(202).json({
      success: true,
      message:
        "If the account exists and is unverified, a verification email has been sent",
    });
  },
);

/**
 * Verify email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});
