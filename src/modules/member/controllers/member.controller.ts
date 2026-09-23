import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";

import * as memberService from "../services/member.service.js";
import type {
  MemberFinancialHistoryQuery,
  MemberListQuery,
} from "../member.types.js";

/**
 * Create member
 */
export const createMember = asyncHandler(
  async (req: Request, res: Response) => {
    const member = await memberService.createMember(req.body);

    res
      .status(201)
      .json(successResponse("Member created successfully", member));
  },
);

/**
 * Get all members
 */
export const getAllMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await memberService.getAllMembers(
      req.query as unknown as MemberListQuery,
    );

    res
      .status(200)
      .json(
        paginatedResponse(
          "Members fetched successfully",
          result.members,
          result.meta,
        ),
      );
  },
);

/**
 * Get member by ID
 */
export const getMemberById = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.id);

    const member = await memberService.getMemberById(memberId);

    res
      .status(200)
      .json(successResponse("Member fetched successfully", member));
  },
);

/**
 * Update member
 */
export const updateMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.id);

    const member = await memberService.updateMember(memberId, req.body);

    res
      .status(200)
      .json(successResponse("Member updated successfully", member));
  },
);

export const getMemberLoanPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await memberService.getMemberLoanPayments(
      Number(req.params.id),
      req.query as unknown as MemberFinancialHistoryQuery,
    );

    res
      .status(200)
      .json(
        paginatedResponse(
          "Member loan payments fetched successfully",
          result.payments,
          result.meta,
        ),
      );
  },
);

export const getMemberSavingsTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await memberService.getMemberSavingsTransactions(
      Number(req.params.id),
      req.query as unknown as MemberFinancialHistoryQuery,
    );

    res
      .status(200)
      .json(
        paginatedResponse(
          "Member savings transactions fetched successfully",
          result.transactions,
          result.meta,
        ),
      );
  },
);

export const uploadMemberPhoto = asyncHandler(
  async (req: Request, res: Response) => {
    const member = await memberService.uploadMemberPhoto(
      Number(req.params.id),
      req.file,
    );

    res
      .status(200)
      .json(successResponse("Member profile photo uploaded successfully", member));
  },
);

/**
 * Delete member
 */
export const deleteMember = asyncHandler(
  async (req: Request, res: Response) => {
    const memberId = Number(req.params.id);

    await memberService.deleteMember(memberId);

    res.status(204).send();
  },
);
