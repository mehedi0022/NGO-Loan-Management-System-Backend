import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { imageUpload } from "../upload/upload.middleware.js";

import {
  createMember,
  deleteMember,
  getAllMembers,
  getMemberById,
  getMemberLoanPayments,
  getMemberSavingsTransactions,
  updateMember,
  uploadMemberPhoto,
} from "./controllers/member.controller.js";

import {
  createMemberSchema,
  memberIdSchema,
  memberListQuerySchema,
  memberFinancialHistorySchema,
  updateMemberSchema,
} from "./validations/member.validation.js";

const router = Router();

/**
 * All member routes require authentication
 */
router.use(requireAuth);

/**
 * Get all members
 */
router.get(
  "/",
  validate(memberListQuerySchema),
  requirePermission(permissions.membersReadAny),
  getAllMembers,
);

/**
 * Get member by ID
 */
router.get(
  "/:id/loan-payments",
  validate(memberFinancialHistorySchema),
  requirePermission(permissions.collectionsReadAny),
  getMemberLoanPayments,
);

router.get(
  "/:id/savings-transactions",
  validate(memberFinancialHistorySchema),
  requirePermission(permissions.savingsReadAny),
  getMemberSavingsTransactions,
);

router.get(
  "/:id",
  validate(memberIdSchema),
  requirePermission(permissions.membersReadAny),
  getMemberById,
);

/**
 * Create member
 */
router.post(
  "/",
  validate(createMemberSchema),
  requirePermission(permissions.membersCreate),
  createMember,
);

/**
 * Update member
 */
router.patch(
  "/:id",
  validate(updateMemberSchema),
  requirePermission(permissions.membersUpdateAny),
  updateMember,
);

router.post(
  "/:id/photo",
  validate(memberIdSchema),
  requirePermission(permissions.membersUpdateAny),
  imageUpload.single("photo"),
  uploadMemberPhoto,
);

/**
 * Delete member
 * SUPER_ADMIN only based on permission configuration
 */
router.delete(
  "/:id",
  validate(memberIdSchema),
  requirePermission(permissions.membersDeleteAny),
  deleteMember,
);

export default router;
