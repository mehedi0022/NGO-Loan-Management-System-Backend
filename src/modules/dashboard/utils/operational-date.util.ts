import { Temporal } from "temporal-polyfill";

/** The NGO's business-day timezone. */
export const OPERATIONAL_TIME_ZONE = "Asia/Dhaka";

/**
 * Parse an ISO calendar date without allowing JavaScript Date to shift it.
 */
export const parseOperationalDate = (value: string) =>
  Temporal.PlainDate.from(value);

/**
 * Resolve the current NGO operational date from an absolute instant.
 * Accepting `now` makes date-boundary behaviour deterministic in tests.
 */
export const getCurrentOperationalDate = (
  now: Temporal.Instant = Temporal.Now.instant(),
) => now.toZonedDateTimeISO(OPERATIONAL_TIME_ZONE).toPlainDate();

/**
 * Existing business-date columns are stored as UTC-midnight instants.
 * Use this half-open range for dueDate, collectionDate and transactionDate.
 */
export const getStoredBusinessDateRange = (date: Temporal.PlainDate) => ({
  start: Temporal.Instant.from(`${date.toString()}T00:00:00Z`),
  end: Temporal.Instant.from(`${date.add({ days: 1 }).toString()}T00:00:00Z`),
});

/**
 * Use this range for real timestamps such as createdAt. It represents
 * midnight-to-midnight in Dhaka and therefore remains timezone-safe.
 */
export const getOperationalInstantRange = (date: Temporal.PlainDate) => {
  const start = Temporal.ZonedDateTime.from({
    timeZone: OPERATIONAL_TIME_ZONE,
    year: date.year,
    month: date.month,
    day: date.day,
    hour: 0,
    minute: 0,
    second: 0,
  }).toInstant();

  const end = start
    .toZonedDateTimeISO(OPERATIONAL_TIME_ZONE)
    .add({ days: 1 })
    .toInstant();

  return { start, end };
};

export const resolveOperationalDate = (value?: string) =>
  value ? parseOperationalDate(value) : getCurrentOperationalDate();

/** Inclusive calendar-date range used by the dashboard trend. */
export const getOperationalTrendRange = (
  endDate: Temporal.PlainDate,
  days: number,
) => {
  if (!Number.isInteger(days) || days <= 0) {
    throw new RangeError("Trend days must be a positive integer");
  }

  return {
    startDate: endDate.subtract({ days: days - 1 }),
    endDate,
  };
};
