import type { Request, Response } from "express";

import { AuthenticationError } from "../../../errors/AppError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getRefreshTokenCookieOptions,
  refreshTokenClearCookieOptions,
  refreshTokenCookieName,
  refreshTokenLegacyClearCookieOptions,
} from "../../../utils/cookie.util.js";
import { millisecondsUntil } from "../../../config/session-policy.js";
import * as authService from "../services/auth.service.js";

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

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(refreshTokenCookieName, refreshTokenClearCookieOptions);
  if (refreshTokenClearCookieOptions.path !== "/") {
    res.clearCookie(refreshTokenCookieName, refreshTokenLegacyClearCookieOptions);
  }
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies[refreshTokenCookieName];
  if (!oldRefreshToken) {
    throw new AuthenticationError("Refresh token not found");
  }
  const result = await authService.refreshAccessToken(oldRefreshToken);
  setRefreshCookie(res, result);
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken: result.accessToken },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies[refreshTokenCookieName]);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: "Logout successful" });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.auth!.userId);
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out from all sessions",
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body);
  res.status(202).json({ success: true, message: "If the account exists, a password reset email has been sent" });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: "Password reset successfully. Please sign in again." });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.auth!.userId, req.body);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: "Password changed successfully. Please sign in again." });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendVerification(req.body.email);
  res.status(202).json({ success: true, message: "If the account exists and is unverified, a verification email has been sent" });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);
  res.status(200).json({ success: true, message: "Email verified successfully" });
});
