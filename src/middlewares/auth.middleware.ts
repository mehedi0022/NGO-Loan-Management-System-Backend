import type { Request, RequestHandler } from "express";

import { AuthenticationError } from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { accessTokenCookieName } from "../utils/cookie.util.js";

import { findAuthorizationUserById } from "../modules/user/repositories/user.repository.js";

import type { UserRole } from "../auth/roles.js";

export type AuthenticatedUser = {
  userId: number;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  auth: AuthenticatedUser;
};

export const authenticate: RequestHandler = async (req, _res, next) => {
  /**
   * Access token is stored in an httpOnly cookie.
   * cookie-parser must be registered before protected routes.
   */
  const token = req.cookies?.[accessTokenCookieName];

  if (!token || typeof token !== "string") {
    return next(new AuthenticationError("Access token not found"));
  }

  let claims;

  try {
    claims = verifyAccessToken(token);
  } catch {
    return next(new AuthenticationError("Invalid or expired access token"));
  }

  try {
    const user = await findAuthorizationUserById(claims.userId);

    if (!user) {
      throw new AuthenticationError("Authenticated user no longer exists");
    }

    req.auth = {
      userId: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = authenticate;
