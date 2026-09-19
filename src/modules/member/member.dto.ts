import type { FieldOutputTypes } from "../../prisma/contract.js";

type MemberRecord = FieldOutputTypes["public"]["Member"];
type MemberAddressRecord = FieldOutputTypes["public"]["MemberAddress"];
type GuarantorRecord = FieldOutputTypes["public"]["Guarantor"];

/**
 * Member list/basic response
 */
export type PublicMemberDto = Pick<
  MemberRecord,
  | "id"
  | "memberId"
  | "fullName"
  | "fatherName"
  | "motherName"
  | "guardianName"
  | "mobileNumber"
  | "nidNumber"
  | "email"
  | "photoUrl"
  | "occupation"
  | "joinDate"
  | "status"
  | "notes"
  | "createdAt"
  | "updatedAt"
>;

/**
 * Address response
 */
export type MemberAddressDto = Pick<
  MemberAddressRecord,
  | "id"
  | "type"
  | "houseOrHolding"
  | "road"
  | "village"
  | "postOffice"
  | "union"
  | "upazila"
  | "district"
  | "division"
>;

/**
 * Guarantor response
 */
export type GuarantorDto = Pick<
  GuarantorRecord,
  | "id"
  | "fullName"
  | "fatherName"
  | "motherName"
  | "mobileNumber"
  | "nidNumber"
  | "relationship"
  | "houseOrHolding"
  | "road"
  | "village"
  | "postOffice"
  | "union"
  | "upazila"
  | "district"
  | "division"
  | "occupation"
  | "notes"
>;

/**
 * Full member details response
 */
export type MemberDetailsDto = PublicMemberDto & {
  addresses: MemberAddressDto[];
  guarantors: GuarantorDto[];
};
