import { db } from "../../../prisma/db.js";
import type { OrganizationSettingsDTO } from "../settings.types.js";

const toNumber = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const mapSettings = (s: any) => ({
  id: s.id,
  orgName: s.orgName,
  orgShortName: s.orgShortName,
  registrationNo: s.registrationNo,
  establishedYear: s.establishedYear,
  logoUrl: s.logoUrl,
  email: s.email,
  phone: s.phone,
  address: s.address,
  website: s.website,
  currencySymbol: s.currencySymbol,
  currencyCode: s.currencyCode,
  defaultLoanChargeType: s.defaultLoanChargeType,
  defaultLoanChargeValue: toNumber(s.defaultLoanChargeValue),
  defaultLoanFrequency: s.defaultLoanFrequency,
  defaultGraceDays: s.defaultGraceDays,
  latePenaltyPercentage: toNumber(s.latePenaltyPercentage),
  minGeneralSavingsDeposit: toNumber(s.minGeneralSavingsDeposit),
  minSpecialSavingsDeposit: toNumber(s.minSpecialSavingsDeposit),
  updatedAt: s.updatedAt,
});

export const getSettings = async () => {
  let setting = await db.orm.public.OrganizationSetting.select(
    "id",
    "orgName",
    "orgShortName",
    "registrationNo",
    "establishedYear",
    "logoUrl",
    "email",
    "phone",
    "address",
    "website",
    "currencySymbol",
    "currencyCode",
    "defaultLoanChargeType",
    "defaultLoanChargeValue",
    "defaultLoanFrequency",
    "defaultGraceDays",
    "latePenaltyPercentage",
    "minGeneralSavingsDeposit",
    "minSpecialSavingsDeposit",
    "updatedAt",
  ).first();

  if (!setting) {
    setting = await db.orm.public.OrganizationSetting.select(
      "id",
      "orgName",
      "orgShortName",
      "registrationNo",
      "establishedYear",
      "logoUrl",
      "email",
      "phone",
      "address",
      "website",
      "currencySymbol",
      "currencyCode",
      "defaultLoanChargeType",
      "defaultLoanChargeValue",
      "defaultLoanFrequency",
      "defaultGraceDays",
      "latePenaltyPercentage",
      "minGeneralSavingsDeposit",
      "minSpecialSavingsDeposit",
      "updatedAt",
    ).create({
      orgName: "Purbasha Financial Development Organization",
      orgShortName: "PFDO",
      registrationNo: "REG-NGO-2024-001",
      establishedYear: "2018",
      email: "info@purbasha.org",
      phone: "+8801700000000",
      address: "Main Road, Branch Office, Bangladesh",
      currencySymbol: "৳",
      currencyCode: "BDT",
      defaultLoanChargeType: "PERCENTAGE",
      defaultLoanChargeValue: 10 as any,
      defaultLoanFrequency: "WEEKLY",
      defaultGraceDays: 0,
      latePenaltyPercentage: 0 as any,
      minGeneralSavingsDeposit: 50 as any,
      minSpecialSavingsDeposit: 100 as any,
    });
  }

  return mapSettings(setting);
};

export const updateSettings = async (data: OrganizationSettingsDTO) => {
  const current = await getSettings();

  const updatePayload: Record<string, any> = {};

  if (data.orgName !== undefined) updatePayload.orgName = data.orgName;
  if (data.orgShortName !== undefined) updatePayload.orgShortName = data.orgShortName;
  if (data.registrationNo !== undefined) updatePayload.registrationNo = data.registrationNo;
  if (data.establishedYear !== undefined) updatePayload.establishedYear = data.establishedYear;
  if (data.logoUrl !== undefined) updatePayload.logoUrl = data.logoUrl;
  if (data.email !== undefined) updatePayload.email = data.email;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.website !== undefined) updatePayload.website = data.website;
  if (data.currencySymbol !== undefined) updatePayload.currencySymbol = data.currencySymbol;
  if (data.currencyCode !== undefined) updatePayload.currencyCode = data.currencyCode;
  if (data.defaultLoanChargeType !== undefined)
    updatePayload.defaultLoanChargeType = data.defaultLoanChargeType as any;
  if (data.defaultLoanChargeValue !== undefined)
    updatePayload.defaultLoanChargeValue = data.defaultLoanChargeValue as any;
  if (data.defaultLoanFrequency !== undefined)
    updatePayload.defaultLoanFrequency = data.defaultLoanFrequency as any;
  if (data.defaultGraceDays !== undefined)
    updatePayload.defaultGraceDays = data.defaultGraceDays;
  if (data.latePenaltyPercentage !== undefined)
    updatePayload.latePenaltyPercentage = data.latePenaltyPercentage as any;
  if (data.minGeneralSavingsDeposit !== undefined)
    updatePayload.minGeneralSavingsDeposit = data.minGeneralSavingsDeposit as any;
  if (data.minSpecialSavingsDeposit !== undefined)
    updatePayload.minSpecialSavingsDeposit = data.minSpecialSavingsDeposit as any;

  const updated = await db.orm.public.OrganizationSetting.select(
    "id",
    "orgName",
    "orgShortName",
    "registrationNo",
    "establishedYear",
    "logoUrl",
    "email",
    "phone",
    "address",
    "website",
    "currencySymbol",
    "currencyCode",
    "defaultLoanChargeType",
    "defaultLoanChargeValue",
    "defaultLoanFrequency",
    "defaultGraceDays",
    "latePenaltyPercentage",
    "minGeneralSavingsDeposit",
    "minSpecialSavingsDeposit",
    "updatedAt",
  )
    .where({ id: current.id })
    .update(updatePayload);

  return mapSettings(updated);
};
