import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { getSettings, updateSettings } from "./controllers/settings.controller.js";
import { updateSettingsSchema } from "./validations/settings.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(permissions.settingsRead), getSettings);

router.patch(
  "/",
  requirePermission(permissions.settingsUpdate),
  validate(updateSettingsSchema),
  updateSettings,
);

export const settingsRoutes = router;
