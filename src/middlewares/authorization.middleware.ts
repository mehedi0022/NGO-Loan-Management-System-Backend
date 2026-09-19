import type { RequestHandler } from "express";

import { roleHasPermission, type Permission } from "../auth/authorization.js";
import { AuthenticationError, AuthorizationError } from "../errors/AppError.js";
import type { UserRole } from "../auth/roles.js";

const getAuth = (auth: Express.Request["auth"]) => {
  if (!auth) throw new AuthenticationError();
  return auth;
};

export const requireRole = (...allowedRoles: readonly UserRole[]): RequestHandler =>
  (req, _res, next) => {
    try {
      const auth = getAuth(req.auth);
      if (!allowedRoles.includes(auth.role)) throw new AuthorizationError();
      next();
    } catch (error) {
      next(error);
    }
  };

export const requirePermission = (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    try {
      const auth = getAuth(req.auth);
      if (!roleHasPermission(auth.role, permission)) throw new AuthorizationError();
      next();
    } catch (error) {
      next(error);
    }
  };

type OwnershipOptions = {
  param?: string;
  allowRoles?: readonly UserRole[];
};

export const requireOwnership = ({
  param = "id",
  allowRoles = [],
}: OwnershipOptions = {}): RequestHandler => (req, _res, next) => {
  try {
    const auth = getAuth(req.auth);
    if (allowRoles.includes(auth.role)) return next();

    const ownerId = Number(req.params[param]);
    if (!Number.isSafeInteger(ownerId) || ownerId !== auth.userId) {
      throw new AuthorizationError();
    }
    next();
  } catch (error) {
    next(error);
  }
};
