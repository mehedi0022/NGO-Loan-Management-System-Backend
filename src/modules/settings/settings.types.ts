export interface OrganizationSettingsDTO {
  id?: number;
  orgName?: string;
  orgShortName?: string | null;
  registrationNo?: string | null;
  establishedYear?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  currencySymbol?: string;
  currencyCode?: string;
  defaultLoanChargeType?: "FLAT" | "PERCENTAGE";
  defaultLoanChargeValue?: number;
  defaultLoanFrequency?: "WEEKLY" | "MONTHLY";
  defaultGraceDays?: number;
  latePenaltyPercentage?: number;
  minGeneralSavingsDeposit?: number;
  minSpecialSavingsDeposit?: number;
}
