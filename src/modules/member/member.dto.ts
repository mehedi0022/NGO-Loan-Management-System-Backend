import type { FieldOutputTypes } from "../../prisma/contract.js";

type MemberRecord = FieldOutputTypes["public"]["Member"];
type MemberAddressRecord = FieldOutputTypes["public"]["MemberAddress"];
type GuarantorRecord = FieldOutputTypes["public"]["Guarantor"];
type LoanRecord = FieldOutputTypes["public"]["Loan"];
type LoanInstallmentRecord = FieldOutputTypes["public"]["LoanInstallment"];
type SavingsAccountRecord = FieldOutputTypes["public"]["SavingsAccount"];

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

export type MemberLoanInstallmentDto = Pick<
  LoanInstallmentRecord,
  | "id"
  | "loanId"
  | "installmentNo"
  | "dueDate"
  | "amount"
  | "paidAmount"
  | "status"
  | "paidAt"
>;

export type MemberLoanDto = Pick<
  LoanRecord,
  | "id"
  | "loanId"
  | "memberId"
  | "principalAmount"
  | "totalPayable"
  | "installmentCount"
  | "frequency"
  | "applicationDate"
  | "disbursementDate"
  | "firstDueDate"
  | "maturityDate"
  | "status"
> & {
  installments: MemberLoanInstallmentDto[];
};

export type MemberSavingsAccountDto = Pick<
  SavingsAccountRecord,
  | "id"
  | "accountId"
  | "generalSavingsBalance"
  | "specialSavingsBalance"
  | "status"
  | "openedAt"
  | "closedAt"
>;

/**
 * Full member details response
 */
export type MemberDetailsDto = PublicMemberDto & {
  addresses: MemberAddressDto[];
  guarantors: GuarantorDto[];
  loans: MemberLoanDto[];
  savingsAccount: MemberSavingsAccountDto | null;
};
