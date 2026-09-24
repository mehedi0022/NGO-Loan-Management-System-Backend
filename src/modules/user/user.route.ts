import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  createUser,
  changeUserRole,
  changeUserStatus,
  resetUserPassword,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
} from "./controllers/user.controller.js";
import {
  updateUserSchema,
  userIdSchema,
  userListQuerySchema,
  createUserSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
  resetUserPasswordSchema,
} from "./validations/user.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);

router.get(
  "/",
  validate(userListQuerySchema),
  requirePermission(permissions.usersReadAny),
  getAllUsers,
);
router.get(
  "/:id",
  validate(userIdSchema),
  requirePermission(permissions.usersReadAny),
  getUserById,
);
router.post(
  "/",
  validate(createUserSchema),
  requirePermission(permissions.usersCreate),
  createUser,
);
router.patch(
  "/:id/role",
  validate(changeUserRoleSchema),
  requirePermission(permissions.usersChangeRole),
  changeUserRole,
);
router.patch(
  "/:id/status",
  validate(changeUserStatusSchema),
  requirePermission(permissions.usersChangeStatus),
  changeUserStatus,
);
router.post(
  "/:id/reset-password",
  validate(resetUserPasswordSchema),
  requirePermission(permissions.usersResetPassword),
  resetUserPassword,
);
router.patch(
  "/:id",
  validate(updateUserSchema),
  requirePermission(permissions.usersUpdateAny),
  updateUser,
);
export default router;
