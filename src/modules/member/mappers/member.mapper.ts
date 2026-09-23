import type {
  PublicMemberDto,
  MemberAddressDto,
  GuarantorDto,
  MemberLoanDto,
  MemberLoanInstallmentDto,
  MemberDetailsDto,
  MemberSavingsAccountDto,
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

const toMemberLoanInstallmentDto = (
  installment: MemberLoanInstallmentDto,
): MemberLoanInstallmentDto => ({
  id: installment.id,
  loanId: installment.loanId,
  installmentNo: installment.installmentNo,
  dueDate: installment.dueDate,
  amount: installment.amount,
  paidAmount: installment.paidAmount,
  status: installment.status,
  paidAt: installment.paidAt,
});

const toMemberLoanDto = (loan: MemberLoanDto): MemberLoanDto => ({
  id: loan.id,
  loanId: loan.loanId,
  memberId: loan.memberId,
  principalAmount: loan.principalAmount,
  totalPayable: loan.totalPayable,
  installmentCount: loan.installmentCount,
  frequency: loan.frequency,
  applicationDate: loan.applicationDate,
  disbursementDate: loan.disbursementDate,
  firstDueDate: loan.firstDueDate,
  maturityDate: loan.maturityDate,
  status: loan.status,
  installments: loan.installments
    .map(toMemberLoanInstallmentDto)
    .sort((left, right) => left.installmentNo - right.installmentNo),
});

const toMemberSavingsAccountDto = (
  account: MemberSavingsAccountDto,
): MemberSavingsAccountDto => ({
  id: account.id,
  accountId: account.accountId,
  generalSavingsBalance: account.generalSavingsBalance,
  specialSavingsBalance: account.specialSavingsBalance,
  status: account.status,
  openedAt: account.openedAt,
  closedAt: account.closedAt,
});

export const toMemberDetailsDto = (
  member: MemberDetailsDto,
): MemberDetailsDto => ({
  ...toPublicMemberDto(member),
  addresses: member.addresses.map(toMemberAddressDto),
  guarantors: member.guarantors.map(toGuarantorDto),
  loans: member.loans
    .map(toMemberLoanDto)
    .sort((left, right) => right.id - left.id),
  savingsAccount: member.savingsAccount
    ? toMemberSavingsAccountDto(member.savingsAccount)
    : null,
});
