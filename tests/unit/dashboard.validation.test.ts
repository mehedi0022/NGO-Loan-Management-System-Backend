import { describe, expect, it } from "vitest";

import { dashboardSummaryQuerySchema } from "../../src/modules/dashboard/validations/dashboard.validation.js";

describe("dashboard summary query validation", () => {
  it("defaults the trend to seven days", () => {
    const result = dashboardSummaryQuerySchema.parse({ query: {} });
    expect(result.query).toEqual({ trendDays: 7 });
  });

  it("accepts a valid operational date and supported trend", () => {
    const result = dashboardSummaryQuerySchema.parse({
      query: { date: "2026-09-23", trendDays: "30" },
    });
    expect(result.query).toEqual({ date: "2026-09-23", trendDays: 30 });
  });

  it.each(["2026-02-30", "23-09-2026", "not-a-date"])(
    "rejects invalid date %s",
    (date) => {
      expect(
        dashboardSummaryQuerySchema.safeParse({ query: { date } }).success,
      ).toBe(false);
    },
  );

  it.each([0, 14, 31])("rejects unsupported trendDays %s", (trendDays) => {
    expect(
      dashboardSummaryQuerySchema.safeParse({ query: { trendDays } }).success,
    ).toBe(false);
  });
});
