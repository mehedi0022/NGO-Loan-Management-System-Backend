import { migrateSingleMember } from "./migration.repository.js";
import type {
  MigrateBatchInput,
  MigrateBatchResult,
  MigrateSingleMemberInput,
  MigrateSingleResult,
} from "./migration.types.js";

export const migrateSingle = async (
  input: MigrateSingleMemberInput,
  userId: number,
): Promise<MigrateSingleResult> => {
  return migrateSingleMember(input, userId);
};

export const migrateBatch = async (
  input: MigrateBatchInput,
  userId: number,
): Promise<MigrateBatchResult> => {
  const results: MigrateBatchResult["results"] = [];
  let successfulCount = 0;
  let failedCount = 0;

  for (const memberData of input.members) {
    try {
      const res = await migrateSingleMember(memberData, userId);
      results.push({
        success: true,
        data: res,
      });
      successfulCount += 1;
    } catch (err: any) {
      failedCount += 1;
      results.push({
        success: false,
        memberName: memberData.fullName,
        memberId: memberData.memberId,
        error: err.message || "Failed to migrate member",
      });
    }
  }

  return {
    totalProcessed: input.members.length,
    successfulCount,
    failedCount,
    results,
  };
};

export const getTemplateColumns = () => {
  return [
    {
      key: "memberId",
      label: "Member Code / ID",
      required: false,
      example: "M-1001",
    },
    {
      key: "fullName",
      label: "Full Name",
      required: true,
      example: "Md. Rafiqul Islam",
    },
    {
      key: "fatherName",
      label: "Father Name",
      required: true,
      example: "Abdul Gafur",
    },
    {
      key: "motherName",
      label: "Mother Name",
      required: true,
      example: "Rahima Begum",
    },
    {
      key: "mobileNumber",
      label: "Mobile Number",
      required: true,
      example: "01712345678",
    },
    {
      key: "nidNumber",
      label: "NID Number",
      required: false,
      example: "19851234567890123",
    },
    { key: "somitiId", label: "Somiti ID", required: false, example: "1" },
    {
      key: "joinDate",
      label: "Join Date (YYYY-MM-DD)",
      required: false,
      example: "2024-01-15",
    },
    { key: "village", label: "Village", required: true, example: "Bhatpara" },
    {
      key: "postOffice",
      label: "Post Office",
      required: true,
      example: "Bhatpara",
    },
    {
      key: "upazila",
      label: "Upazila",
      required: true,
      example: "Kushtia Sadar",
    },
    { key: "district", label: "District", required: true, example: "Kushtia" },
    {
      key: "generalSavingsBalance",
      label: "General Savings Balance",
      required: false,
      example: "5000",
    },
    {
      key: "specialSavingsBalance",
      label: "Special Savings Balance",
      required: false,
      example: "1000",
    },
    {
      key: "loanPrincipal",
      label: "Active Loan Principal (if any)",
      required: false,
      example: "50000",
    },
    {
      key: "loanChargeValue",
      label: "Loan Charge % (e.g. 10)",
      required: false,
      example: "10",
    },
    {
      key: "loanInstallmentCount",
      label: "Loan Total Installments (e.g. 46)",
      required: false,
      example: "46",
    },
    {
      key: "loanFrequency",
      label: "Loan Frequency (WEEKLY / MONTHLY)",
      required: false,
      example: "WEEKLY",
    },
    {
      key: "loanDisbursementDate",
      label: "Loan Disbursement Date (YYYY-MM-DD)",
      required: false,
      example: "2025-06-01",
    },
    {
      key: "loanFirstDueDate",
      label: "Loan First Due Date (YYYY-MM-DD)",
      required: false,
      example: "2025-06-08",
    },
    {
      key: "loanPaidInstallments",
      label: "Loan Paid Installments Count (e.g. 20)",
      required: false,
      example: "20",
    },
    {
      key: "dpsInstallmentAmount",
      label: "DPS Monthly Installment (if any)",
      required: false,
      example: "500",
    },
    {
      key: "dpsDurationMonths",
      label: "DPS Duration Months (e.g. 36)",
      required: false,
      example: "36",
    },
    {
      key: "dpsInterestRate",
      label: "DPS Interest Rate % (e.g. 8)",
      required: false,
      example: "8",
    },
    {
      key: "dpsStartDate",
      label: "DPS Start Date (YYYY-MM-DD)",
      required: false,
      example: "2025-01-01",
    },
    {
      key: "dpsPaidInstallments",
      label: "DPS Paid Installments Count (e.g. 10)",
      required: false,
      example: "10",
    },
  ];
};
