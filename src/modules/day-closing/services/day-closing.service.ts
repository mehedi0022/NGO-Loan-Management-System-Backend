import { Temporal } from "temporal-polyfill";
import { ValidationError } from "../../../errors/AppError.js";
import type {
  ExecuteDayClosingInput,
  ListDayClosingsQuery,
} from "../day-closing.types.js";
import * as repository from "../repositories/day-closing.repository.js";

export const getActiveBusinessDay = async () => {
  return await repository.getActiveBusinessDay();
};

export const getDayClosingPreview = async () => {
  return await repository.getDayClosingPreview();
};

export const executeDayClosing = async (
  userId: number,
  input: ExecuteDayClosingInput,
) => {
  if (!userId) {
    throw new ValidationError("User ID is required to execute day closing");
  }

  const activeDay = await repository.getActiveBusinessDay();
  if (activeDay.status !== "OPEN") {
    throw new ValidationError("No active open business day to close");
  }

  // If nextBusinessDate is provided, make sure it's strictly greater than current active business date
  if (input.nextBusinessDate && input.nextBusinessDate <= activeDay.businessDate) {
    throw new ValidationError(
      `Next business date must be strictly after the current business date (${activeDay.businessDate})`,
    );
  }

  return await repository.executeDayClosing(userId, input);
};

export const listDayClosings = async (query: ListDayClosingsQuery) => {
  return await repository.listDayClosings(query);
};

export const assertBusinessDateNotClosed = async (dateStr: string) => {
  const closed = await repository.isDateClosed(dateStr);
  if (closed) {
    throw new ValidationError(
      `Business day ${dateStr} is already CLOSED. No new transactions or modifications are allowed on closed dates.`,
    );
  }
};

export const assertCanReverseTransaction = async (
  txDate: Date | string | Temporal.Instant | null | undefined,
  txCode?: string,
) => {
  if (!txDate) return;
  let dateStr: string;
  if (txDate instanceof Date) {
    dateStr = Temporal.Instant.from(txDate.toISOString())
      .toZonedDateTimeISO("Asia/Dhaka")
      .toPlainDate()
      .toString();
  } else if (txDate instanceof Temporal.Instant) {
    dateStr = txDate.toZonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();
  } else if (typeof txDate === "string") {
    dateStr = txDate.includes("T") ? txDate.split("T")[0]! : txDate.trim();
  } else {
    dateStr = String(txDate).slice(0, 10);
  }

  const closed = await repository.isDateClosed(dateStr);
  if (closed) {
    throw new ValidationError(
      `Cannot reverse transaction ${txCode ? `(${txCode})` : ""}: Business day ${dateStr} has already been CLOSED. Reversals are strictly forbidden on closed dates.`,
    );
  }

  const activeDay = await repository.getActiveBusinessDay();
  if (activeDay.status !== "OPEN" || dateStr !== activeDay.businessDate) {
    throw new ValidationError(
      `Cannot reverse transaction ${txCode ? `(${txCode})` : ""}: Its business date (${dateStr}) does not match the active open business day (${activeDay.businessDate}).`,
    );
  }
};
