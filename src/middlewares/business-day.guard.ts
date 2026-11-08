import type { NextFunction, Request, Response } from "express";
import { Temporal } from "temporal-polyfill";
import { ValidationError } from "../errors/AppError.js";
import { isDateClosed } from "../modules/day-closing/repositories/day-closing.repository.js";

/**
 * Helper to normalize any date input (string, Date object, or undefined)
 * into a clean YYYY-MM-DD string in Asia/Dhaka.
 */
const toCleanDateStr = (rawVal: unknown): string => {
  if (!rawVal) {
    return Temporal.Now.zonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();
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
      return trimmed.split("T")[0]!;
    }
    return trimmed;
  }
  return Temporal.Now.zonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();
};

/**
 * Middleware to guard routes from creating or altering transactions
 * on dates that have already been CLOSED by the administrator.
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
          req.body?.disbursementDate;
      }

      const cleanDateStr = toCleanDateStr(rawDate);

      if (cleanDateStr && cleanDateStr.length === 10) {
        const closed = await isDateClosed(cleanDateStr);
        if (closed) {
          throw new ValidationError(
            `Business day ${cleanDateStr} has already been CLOSED by the administrator. No new collections, deposits, withdrawals, or disbursements are allowed on closed dates.`,
          );
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
