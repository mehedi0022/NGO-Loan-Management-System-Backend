import { NotFoundError } from "../../../errors/AppError.js";

import * as memberRepository from "../repositories/member.repository.js";

import type {
  CreateMemberInput,
  MemberListQuery,
  UpdateMemberInput,
} from "../member.types.js";

import { toPublicMemberDto } from "../mappers/member.mapper.js";

/**
 * Get all members
 */
export const getAllMembers = async (query: MemberListQuery) => {
  const result = await memberRepository.findAllMembers(query);

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

  return toPublicMemberDto(member);
};

/**
 * Create member
 */
export const createMember = async (data: CreateMemberInput) => {
  const member = await memberRepository.createMember(data);

  const memberId = `MEM-${String(member.id).padStart(6, "0")}`;

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
export const updateMember = async (id: number, data: UpdateMemberInput) => {
  const existingMember = await memberRepository.findMemberById(id);

  if (!existingMember) {
    throw new NotFoundError("Member not found");
  }

  const member = await memberRepository.updateMemberById(id, data);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  return toPublicMemberDto(member);
};

/**
 * Delete member
 */
export const deleteMember = async (id: number) => {
  const existingMember = await memberRepository.findMemberById(id);

  if (!existingMember) {
    throw new NotFoundError("Member not found");
  }

  await memberRepository.deleteMemberById(id);
};
