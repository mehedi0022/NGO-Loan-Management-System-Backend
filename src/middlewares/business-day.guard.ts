import type { NextFunction, Request, Response } from "express";
import { Temporal } from "temporal-polyfill";
import { ValidationError } from "../errors/AppError.js";
import { getActiveBusinessDay, isDateClosed } from "../modules/day-closing/repositories/day-closing.repository.js";

/**
 * Helper to normalize any date input (string, Date object, or undefined)
 * into a clean YYYY-MM-DD string in Asia/Dhaka.
 */
const toCleanDateStr = (rawVal: unknown): string => {
  if (!rawVal) {
    return "";
  }
  if (rawVal instanceof Date) {
    return Temporal.Instant.from(rawVal.toISOString())
      .toZonedDateTimeISO("Asia/Dhaka")
      .toPlainDate()
      .toString();
  }
  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim();
    if (trimmed.includes("T")) {
      try {
        return Temporal.Instant.from(trimmed)
          .toZonedDateTimeISO("Asia/Dhaka")
          .toPlainDate()
          .toString();
      } catch {
        return trimmed.split("T")[0]!;
      }
    }
    return trimmed;
  }
  return "";
};

/**
 * Middleware to guard routes from creating or altering transactions
 * on dates that have already been CLOSED or are in the future relative
 * to the active business day.
 */
export const guardBusinessDayNotClosed = (dateExtractor?: (req: Request) => unknown) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let rawDate: unknown;

      if (dateExtractor) {
        rawDate = dateExtractor(req);
      } else {
        rawDate =
          req.body?.collectionDate ??
          req.body?.transactionDate ??
          req.body?.date ??
          req.body?.disbursementDate ??
          req.body?.depositDate ??
          req.body?.transferDate;
      }

      const activeDay = await getActiveBusinessDay();
      const activeBusinessDate = activeDay.businessDate;

      const cleanDateStr = toCleanDateStr(rawDate) || activeBusinessDate;

      if (cleanDateStr < activeBusinessDate) {
        throw new ValidationError(
          `Business day ${cleanDateStr} is in the past and has already been CLOSED. No new collections, deposits, withdrawals, or disbursements are allowed on closed dates.`,
        );
      }

      if (cleanDateStr > activeBusinessDate) {
        throw new ValidationError(
          `Transactions cannot be posted for future date ${cleanDateStr}. Current active business day is ${activeBusinessDate}.`,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
