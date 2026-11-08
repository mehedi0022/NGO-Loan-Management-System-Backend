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
