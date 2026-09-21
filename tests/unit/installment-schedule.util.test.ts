import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { generateInstallmentSchedule } from "../../src/modules/loan/utils/installment-schedule.util.js";

describe("installment schedule generation", () => {
  it("assigns the exact remaining balance to the final installment", () => {
    const schedule = generateInstallmentSchedule({
      totalPayable: "55000.00",
      installmentCount: 12,
      installmentAmount: "4580.00",
      frequency: "MONTHLY",
      firstDueDate: Temporal.PlainDate.from("2026-10-15"),
    });

    expect(schedule).toHaveLength(12);
    expect(schedule[0]).toMatchObject({
      installmentNo: 1,
      dueDate: Temporal.PlainDate.from("2026-10-15"),
      amount: "4580.00",
    });
    expect(schedule[10].amount).toBe("4580.00");
    expect(schedule[11]).toMatchObject({
      installmentNo: 12,
      dueDate: Temporal.PlainDate.from("2027-09-15"),
      amount: "4620.00",
    });
    expect(schedule.reduce((sum, item) => sum + Number(item.amount), 0)).toBe(
      55000,
    );
  });

  it("creates one full-value installment for a single-installment loan", () => {
    const schedule = generateInstallmentSchedule({
      totalPayable: "12000.00",
      installmentCount: 1,
      installmentAmount: "12000.00",
      frequency: "MONTHLY",
      firstDueDate: Temporal.PlainDate.from("2026-10-15"),
    });

    expect(schedule).toEqual([
      {
        installmentNo: 1,
        dueDate: Temporal.PlainDate.from("2026-10-15"),
        amount: "12000.00",
      },
    ]);
  });

  it("uses seven-day intervals for weekly schedules", () => {
    const schedule = generateInstallmentSchedule({
      totalPayable: "300.00",
      installmentCount: 3,
      installmentAmount: "100.00",
      frequency: "WEEKLY",
      firstDueDate: Temporal.PlainDate.from("2026-09-28"),
    });

    expect(schedule.map((item) => item.dueDate.toString())).toEqual([
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
    ]);
  });

  it("keeps the intended day of month while safely clamping short months", () => {
    const schedule = generateInstallmentSchedule({
      totalPayable: "500.00",
      installmentCount: 5,
      installmentAmount: "100.00",
      frequency: "MONTHLY",
      firstDueDate: Temporal.PlainDate.from("2026-01-31"),
    });

    expect(schedule.map((item) => item.dueDate.toString())).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });
});
