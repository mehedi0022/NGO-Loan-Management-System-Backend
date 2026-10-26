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
  member: any,
): PublicMemberDto => ({
  id: member.id,
  memberId: member.memberId,
  somitiId: member.somitiId ?? null,
  somiti: member.somiti
    ? {
        id: member.somiti.id,
        somitiId: member.somiti.somitiId,
        name: member.somiti.name,
        code: member.somiti.code,
        meetingDay: member.somiti.meetingDay,
      }
    : null,
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
  installment: any,
): MemberLoanInstallmentDto => {
  let generalSavingsAmount: string | null = null;
  let specialSavingsAmount: string | null = null;
  let collectionReceipt: string | null = null;
  let effectivePaidAt: string | null = installment.paidAt;

  if (installment.payments && Array.isArray(installment.payments)) {
    let genSum = 0;
    let spcSum = 0;
    for (const payment of installment.payments) {
      if (!effectivePaidAt && payment.paymentDate) {
        effectivePaidAt = payment.paymentDate;
      }
      if (payment.collection) {
        if (!collectionReceipt && payment.collection.collectionId) {
          collectionReceipt = payment.collection.collectionId;
        }
        genSum += Number(payment.collection.generalSavingsAmount || 0);
        spcSum += Number(payment.collection.specialSavingsAmount || 0);
      }
    }
    if (genSum > 0) generalSavingsAmount = genSum.toFixed(2);
    if (spcSum > 0) specialSavingsAmount = spcSum.toFixed(2);
  }

  return {
    id: installment.id,
    loanId: installment.loanId,
    installmentNo: installment.installmentNo,
    dueDate: installment.dueDate,
    amount: installment.amount,
    paidAmount: installment.paidAmount,
    status: installment.status,
    paidAt: effectivePaidAt,
    generalSavingsAmount,
    specialSavingsAmount,
    collectionReceipt,
  };
};

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
  member: any,
): MemberDetailsDto => ({
  ...toPublicMemberDto(member),
  addresses: (member.addresses || []).map(toMemberAddressDto),
  guarantors: (member.guarantors || []).map(toGuarantorDto),
  loans: (member.loans || [])
    .map(toMemberLoanDto)
    .sort((left: any, right: any) => right.id - left.id),
  savingsAccount: member.savingsAccount
    ? toMemberSavingsAccountDto(member.savingsAccount)
    : null,
  dpsAccounts: member.dpsAccounts || [],
});
