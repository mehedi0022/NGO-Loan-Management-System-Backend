import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/settings/repositories/settings.repository.js", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

import * as repository from "../../src/modules/settings/repositories/settings.repository.js";
import {
  getSettings,
  updateSettings,
} from "../../src/modules/settings/services/settings.service.js";

describe("Settings Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retrieves organization settings successfully", async () => {
    vi.mocked(repository.getSettings).mockResolvedValue({
      id: 1,
      orgName: "Purbasha Financial Development Organization",
      orgShortName: "PFDO",
      registrationNo: "REG-NGO-2024-001",
      establishedYear: "2018",
      logoUrl: null,
      email: "info@purbasha.org",
      phone: "+8801700000000",
      address: "Main Road, Branch Office, Bangladesh",
      website: null,
      currencySymbol: "৳",
      currencyCode: "BDT",
      defaultLoanChargeType: "PERCENTAGE",
      defaultLoanChargeValue: 10,
      defaultLoanFrequency: "WEEKLY",
      defaultGraceDays: 0,
      latePenaltyPercentage: 0,
      minGeneralSavingsDeposit: 50,
      minSpecialSavingsDeposit: 100,
      updatedAt: new Date(),
    });

    const result = await getSettings();
    expect(result.id).toBe(1);
    expect(result.orgName).toBe("Purbasha Financial Development Organization");
    expect(repository.getSettings).toHaveBeenCalled();
  });

  it("updates organization settings successfully", async () => {
    vi.mocked(repository.updateSettings).mockResolvedValue({
      id: 1,
      orgName: "Purbasha Foundation",
      orgShortName: "PF",
      registrationNo: "REG-999",
      establishedYear: "2019",
      logoUrl: null,
      email: "contact@purbasha.org",
      phone: "+8801800000000",
      address: "Dhaka, Bangladesh",
      website: "https://purbasha.org",
      currencySymbol: "৳",
      currencyCode: "BDT",
      defaultLoanChargeType: "PERCENTAGE",
      defaultLoanChargeValue: 12,
      defaultLoanFrequency: "WEEKLY",
      defaultGraceDays: 3,
      latePenaltyPercentage: 1,
      minGeneralSavingsDeposit: 100,
      minSpecialSavingsDeposit: 200,
      updatedAt: new Date(),
    });

    const result = await updateSettings({
      orgName: "Purbasha Foundation",
      orgShortName: "PF",
      defaultLoanChargeValue: 12,
      defaultGraceDays: 3,
    });

    expect(result.orgName).toBe("Purbasha Foundation");
    expect(result.defaultLoanChargeValue).toBe(12);
    expect(repository.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        orgName: "Purbasha Foundation",
        defaultLoanChargeValue: 12,
      }),
    );
  });
});
