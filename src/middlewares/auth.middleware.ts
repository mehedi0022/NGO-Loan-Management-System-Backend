import type { Request, RequestHandler } from "express";
import { AuthenticationError } from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { findAuthorizationUserById } from "../modules/user/repositories/user.repository.js";
import type { UserRole } from "../auth/roles.js";

export type AuthenticatedUser = {
  userId: number;
  role: UserRole;
};
export type AuthenticatedRequest = Request & { auth: AuthenticatedUser };

export const authenticate: RequestHandler = async (req, _res, next) => {
  const authorization = req.get("authorization");
  const [scheme, token, extra] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return next(new AuthenticationError());
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    return next(new AuthenticationError("Invalid or expired access token"));
  }

  try {
    const user = await findAuthorizationUserById(claims.userId);
    if (!user) throw new AuthenticationError("Authenticated user no longer exists");
    req.auth = { userId: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = authenticate;
