import type {
  PublicMemberDto,
  MemberAddressDto,
  GuarantorDto,
  MemberDetailsDto,
} from "../member.dto.js";

export const toPublicMemberDto = (
  member: PublicMemberDto,
): PublicMemberDto => ({
  id: member.id,
  memberId: member.memberId,
  fullName: member.fullName,
  fatherName: member.fatherName,
  motherName: member.motherName,
  guardianName: member.guardianName,
  mobileNumber: member.mobileNumber,
  nidNumber: member.nidNumber,
  email: member.email,
  photoUrl: member.photoUrl,
  occupation: member.occupation,
  joinDate: member.joinDate,
  status: member.status,
  notes: member.notes,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
});

export const toMemberAddressDto = (
  address: MemberAddressDto,
): MemberAddressDto => ({
  id: address.id,
  type: address.type,
  houseOrHolding: address.houseOrHolding,
  road: address.road,
  village: address.village,
  postOffice: address.postOffice,
  union: address.union,
  upazila: address.upazila,
  district: address.district,
  division: address.division,
});

export const toGuarantorDto = (guarantor: GuarantorDto): GuarantorDto => ({
  id: guarantor.id,
  fullName: guarantor.fullName,
  fatherName: guarantor.fatherName,
  motherName: guarantor.motherName,
  mobileNumber: guarantor.mobileNumber,
  nidNumber: guarantor.nidNumber,
  relationship: guarantor.relationship,
  houseOrHolding: guarantor.houseOrHolding,
  road: guarantor.road,
  village: guarantor.village,
  postOffice: guarantor.postOffice,
  union: guarantor.union,
  upazila: guarantor.upazila,
  district: guarantor.district,
  division: guarantor.division,
  occupation: guarantor.occupation,
  notes: guarantor.notes,
});

export const toMemberDetailsDto = (
  member: MemberDetailsDto,
): MemberDetailsDto => ({
  ...toPublicMemberDto(member),
  addresses: member.addresses.map(toMemberAddressDto),
  guarantors: member.guarantors.map(toGuarantorDto),
});
