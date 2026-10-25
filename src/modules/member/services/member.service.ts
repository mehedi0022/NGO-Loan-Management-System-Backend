import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";

import * as memberRepository from "../repositories/member.repository.js";
import { findSomitiById } from "../../somiti/repositories/somiti.repository.js";
import { uploadService } from "../../upload/upload.module.js";

import type {
  CreateMemberInput,
  MemberListQuery,
  MemberFinancialHistoryQuery,
  UpdateMemberInput,
} from "../member.types.js";

import {
  toPublicMemberDto,
  toMemberDetailsDto,
} from "../mappers/member.mapper.js";

type Actor = {
  userId: number;
  role: string;
};

/**
 * Get all members
 */
export const getAllMembers = async (query: MemberListQuery, actor?: Actor) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : undefined;

  const result = await memberRepository.findAllMembers({
    ...query,
    fieldOfficerId,
  });

  return {
    members: result.members.map(toPublicMemberDto),
    meta: result.meta,
  };
};

/**
 * Get member by ID
 */
export const getMemberById = async (id: number) => {
  const member = await memberRepository.findMemberById(id);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  return toMemberDetailsDto(member);
};

/**
 * Create member
 */
export const createMember = async (data: CreateMemberInput, actor?: Actor) => {
  if (data.nidNumber) {
    const existingMember = await memberRepository.findMemberByNid(
      data.nidNumber,
    );

    if (existingMember) {
      throw new ConflictError("A member with this NID already exists");
    }
  }

  if (data.somitiId) {
    const somiti = await findSomitiById(data.somitiId);
    if (!somiti) {
      throw new NotFoundError("Selected somiti does not exist");
    }
    if (somiti.status !== "ACTIVE") {
      throw new ConflictError("Selected somiti is not active");
    }
    if (
      actor?.role === "FIELD_OFFICER" &&
      somiti.fieldOfficerId !== actor.userId
    ) {
      throw new AuthorizationError(
        "You can only register members into your assigned somitis",
      );
    }
  }

  const member = await memberRepository.createMember(data);

  const memberId = `AC-${String(member.id).padStart(5, "0")}`;

  const updatedMember = await memberRepository.updateMemberId(
    member.id,
    memberId,
  );

  if (!updatedMember) {
    throw new NotFoundError("Failed to generate member ID");
  }

  return toPublicMemberDto(updatedMember);
};

/**
 * Update member
 */
export const updateMember = async (
  id: number,
  data: UpdateMemberInput,
  actor?: Actor,
) => {
  const existingMember = await memberRepository.findMemberById(id);

  if (!existingMember) {
    throw new NotFoundError("Member not found");
  }

  if (data.somitiId && data.somitiId !== existingMember.somitiId) {
    const somiti = await findSomitiById(data.somitiId);
    if (!somiti) {
      throw new NotFoundError("Selected somiti does not exist");
    }
    if (somiti.status !== "ACTIVE") {
      throw new ConflictError("Selected somiti is not active");
    }
    if (
      actor?.role === "FIELD_OFFICER" &&
      somiti.fieldOfficerId !== actor.userId
    ) {
      throw new AuthorizationError(
        "You can only assign members to your assigned somitis",
      );
    }
  }

  // NID uniqueness
  if (data.nidNumber && data.nidNumber !== existingMember.nidNumber) {
    const memberWithNid = await memberRepository.findMemberByNid(
      data.nidNumber,
    );

    if (memberWithNid && memberWithNid.id !== id) {
      throw new ConflictError("A member with this NID already exists");
    }
  }

  const updatedMember = await memberRepository.updateMemberById(id, data);

  if (!updatedMember) {
    throw new NotFoundError("Member not found");
  }

  // Fetch again because updateMemberById()
  // only returns Member scalar fields.
  const member = await memberRepository.findMemberById(id);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  return toMemberDetailsDto(member);
};

export const getMemberLoanPayments = async (
  id: number,
  query: MemberFinancialHistoryQuery,
) => {
  const result = await memberRepository.findMemberLoanPayments(id, query);
  if (!result) throw new NotFoundError("Member not found");
  return result;
};

export const getMemberSavingsTransactions = async (
  id: number,
  query: MemberFinancialHistoryQuery,
) => {
  const result = await memberRepository.findMemberSavingsTransactions(
    id,
    query,
  );
  if (!result) throw new NotFoundError("Member not found");
  return result;
};

export const uploadMemberPhoto = async (
  id: number,
  file: Express.Multer.File | undefined,
) => {
  if (!file) {
    throw new ValidationError("Profile photo is required");
  }

  const member = await memberRepository.findMemberById(id);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  const stored = await uploadService.upload(file, "members");
  const updatedMember = await memberRepository.updateMemberPhotoUrl(id, stored.url);

  if (!updatedMember) {
    await uploadService.delete(stored.key).catch(() => undefined);
    throw new NotFoundError("Member not found");
  }

  return getMemberById(id);
};

export const deleteMember = async (id: number) => {
  const member = await memberRepository.findMemberById(id);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  await memberRepository.deleteMemberById(id);
};
