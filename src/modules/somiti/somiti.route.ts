import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  createSomiti,
  deleteSomiti,
  getActiveSomitiesList,
  getSomitiById,
  getSomitiMembers,
  getSomities,
  updateSomiti,
} from "./controllers/somiti.controller.js";
import {
  createSomitiSchema,
  somitiIdSchema,
  somitiListQuerySchema,
  updateSomitiSchema,
} from "./validations/somiti.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/active", getActiveSomitiesList);

router.get(
  "/",
  validate(somitiListQuerySchema),
  requirePermission(permissions.somitiesReadAny),
  getSomities,
);

router.get(
  "/:id/members",
  validate(somitiIdSchema),
  requirePermission(permissions.somitiesReadAny),
  getSomitiMembers,
);

router.get(
  "/:id",
  validate(somitiIdSchema),
  requirePermission(permissions.somitiesReadAny),
  getSomitiById,
);

router.post(
  "/",
  validate(createSomitiSchema),
  requirePermission(permissions.somitiesCreate),
  createSomiti,
);

router.patch(
  "/:id",
  validate(updateSomitiSchema),
  requirePermission(permissions.somitiesUpdateAny),
  updateSomiti,
);

router.delete(
  "/:id",
  validate(somitiIdSchema),
  requirePermission(permissions.somitiesDeleteAny),
  deleteSomiti,
);

export default router;
