export type MigrateAddressInput = {
  type: "PRESENT" | "FATHER_HOME";
  village: string;
  postOffice: string;
  upazila: string;
  district: string;
  houseOrHolding?: string;
  road?: string;
  union?: string;
  division?: string;
};

export type MigrateGuarantorInput = {
  fullName: string;
  fatherName?: string;
  motherName?: string;
  mobileNumber: string;
  nidNumber?: string;
  relationship: string;
  occupation?: string;
  notes?: string;
  houseOrHolding?: string;
  road?: string;
  village?: string;
  postOffice?: string;
  union?: string;
  upazila?: string;
  district?: string;
  division?: string;
};

export type MigrateSavingsInput = {
  generalSavingsBalance: number;
  specialSavingsBalance?: number;
  openedAt?: string | Date;
};

export type MigrateLoanInput = {
  loanId?: string; // Optional custom/legacy ID, e.g. "LN-2025-01"
  principalAmount: number;
  chargeType: "FLAT" | "PERCENTAGE";
  chargeValue: number;
  installmentCount: number;
  installmentAmount?: number; // Optional custom regular installment amount
  frequency: "WEEKLY" | "MONTHLY";
  disbursementDate: string | Date;
  firstDueDate: string | Date;
  paidInstallments: number; // Count of installments already paid historically
  purpose?: string;
  notes?: string;
};

export type MigrateDpsInput = {
  dpsNumber?: string; // Optional custom/legacy ID, e.g. "DPS-0010"
  frequency?: "WEEKLY" | "MONTHLY";
  installmentAmount: number;
  durationMonths: number;
  interestRate: number;
  startDate: string | Date;
  paidInstallments: number; // Count of installments already paid historically
  notes?: string;
};

export type MigrateSingleMemberInput = {
  // Member Core
  memberId?: string; // Optional legacy code, e.g. "M-1002"
  fullName: string;
  fatherName: string;
  motherName: string;
  guardianName?: string;
  mobileNumber: string;
  nidNumber?: string;
  email?: string;
  occupation?: string;
  joinDate?: string | Date;
  somitiId?: number;
  admissionFee?: number;
  notes?: string;

  // Addresses & Guarantors
  addresses?: MigrateAddressInput[];
  guarantors?: MigrateGuarantorInput[];

  // Optional Financial Sub-Modules for Legacy Onboarding
  savings?: MigrateSavingsInput;
  loan?: MigrateLoanInput;
  dps?: MigrateDpsInput;
};

export type MigrateBatchInput = {
  members: MigrateSingleMemberInput[];
};

export type MigrateSingleResult = {
  success: boolean;
  memberId: number;
  memberCode: string;
  fullName: string;
  savingsAccount?: {
    id: number;
    accountId: string;
    generalBalance: number;
    specialBalance: number;
  };
  loan?: {
    id: number;
    loanId: string;
    status: string;
    principalAmount: number;
    totalPayable: number;
    paidInstallments: number;
    remainingInstallments: number;
  };
  dps?: {
    id: number;
    dpsNumber: string;
    status: string;
    installmentAmount: number;
    paidInstallments: number;
    totalPaid: number;
  };
};

export type MigrateBatchResult = {
  totalProcessed: number;
  successfulCount: number;
  failedCount: number;
  results: Array<
    | { success: true; data: MigrateSingleResult }
    | { success: false; memberName?: string; memberId?: string; error: string }
  >;
};
