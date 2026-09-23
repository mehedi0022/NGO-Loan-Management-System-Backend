import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";

import {
  getCurrentOperationalDate,
  getOperationalInstantRange,
  getOperationalTrendRange,
  getStoredBusinessDateRange,
  parseOperationalDate,
} from "../../src/modules/dashboard/utils/operational-date.util.js";

describe("dashboard operational date", () => {
  it("resolves the date using Asia/Dhaka rather than UTC", () => {
    const instant = Temporal.Instant.from("2026-09-22T19:00:00Z");
    expect(getCurrentOperationalDate(instant).toString()).toBe("2026-09-23");
  });

  it("creates a half-open UTC-midnight range for stored business dates", () => {
    const range = getStoredBusinessDateRange(parseOperationalDate("2026-09-23"));
    expect(range.start.toString()).toBe("2026-09-23T00:00:00Z");
    expect(range.end.toString()).toBe("2026-09-24T00:00:00Z");
  });

  it("creates the real Dhaka midnight range for event timestamps", () => {
    const range = getOperationalInstantRange(parseOperationalDate("2026-09-23"));
    expect(range.start.toString()).toBe("2026-09-22T18:00:00Z");
    expect(range.end.toString()).toBe("2026-09-23T18:00:00Z");
  });

  it.each([
    [7, "2026-09-17"],
    [30, "2026-08-25"],
  ])("creates an inclusive %i-day trend range", (days, expectedStart) => {
    const range = getOperationalTrendRange(
      parseOperationalDate("2026-09-23"),
      days,
    );
    expect(range.startDate.toString()).toBe(expectedStart);
    expect(range.endDate.toString()).toBe("2026-09-23");
  });

  it("rejects a non-positive trend length", () => {
    expect(() =>
      getOperationalTrendRange(parseOperationalDate("2026-09-23"), 0),
    ).toThrow(RangeError);
  });
});
