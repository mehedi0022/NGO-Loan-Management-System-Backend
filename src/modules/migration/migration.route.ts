import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getTemplateController,
  migrateBatchMembersController,
  migrateSingleMemberController,
} from "./migration.controller.js";
import {
  batchMemberMigrationSchema,
  singleMemberMigrationSchema,
} from "./migration.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/template", getTemplateController);

router.post(
  "/single",
  requirePermission(permissions.migrationExecute),
  validate(singleMemberMigrationSchema),
  migrateSingleMemberController,
);

router.post(
  "/batch",
  requirePermission(permissions.migrationExecute),
  validate(batchMemberMigrationSchema),
  migrateBatchMembersController,
);

export default router;
