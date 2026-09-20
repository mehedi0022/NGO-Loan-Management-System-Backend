import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  requireOwnership,
  requirePermission,
  requireRole,
} from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  createUser,
  deleteUser,
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
  requireOwnership({ allowRoles: ["SUPER_ADMIN", "ADMIN"] }),
  getUserById,
);
router.post(
  "/",
  validate(createUserSchema),
  requireRole("SUPER_ADMIN"),
  createUser,
);
router.patch(
  "/:id",
  validate(updateUserSchema),
  requireOwnership({ allowRoles: ["SUPER_ADMIN", "ADMIN"] }),
  updateUser,
);
router.delete(
  "/:id",
  validate(userIdSchema),
  requireRole("SUPER_ADMIN"),
  deleteUser,
);

export default router;
