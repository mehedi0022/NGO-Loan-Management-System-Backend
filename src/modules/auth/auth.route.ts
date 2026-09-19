import { Router } from "express";

import { validate } from "../../middlewares/validate.middleware.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { protectCookieAuthFromCsrf } from "../../middlewares/csrf.middleware.js";
import {
  loginRateLimit,
  forgotPasswordRateLimit,
  refreshRateLimit,
  registerRateLimit,
} from "../../middlewares/rateLimit.middleware.js";

import {
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerification,
  verifyEmail,
  logout,
  logoutAll,
  refreshToken,
  register,
} from "./controllers/auth.controller.js";

import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "./validations/auth.validation.js";

const router = Router();

router.use(protectCookieAuthFromCsrf);

router.post("/register", registerRateLimit, validate(registerSchema), register);

router.post("/login", loginRateLimit, validate(loginSchema), login);

router.post("/refresh", refreshRateLimit, refreshToken);
router.post("/forgot-password", forgotPasswordRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.post("/resend-verification", registerRateLimit, validate(forgotPasswordSchema), resendVerification);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);

router.post("/logout", logout);

router.post("/logout-all", authenticate, logoutAll);

export default router;
