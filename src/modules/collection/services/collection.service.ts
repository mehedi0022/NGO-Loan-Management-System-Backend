import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";

import * as repository from "../repositories/collection.repository.js";

import type {
  BatchCollectionInput,
  CreateCollectionInput,
} from "../collection.types.js";

/**
 * Result returned by the repository when processing
 * a single collection or a batch collection.
 */
type CollectionResult = Awaited<
  ReturnType<typeof repository.createCollection>
> & {
  itemIndex?: number;
};

/**
 * Convert repository-level collection result codes
 * into application errors.
 *
 * itemIndex is mainly useful for batch collection,
 * so the API can identify which row failed.
 */
const assertCollectionResult = (result: CollectionResult) => {
  const suffix =
    result.itemIndex !== undefined ? ` (item ${result.itemIndex + 1})` : "";

  switch (result.kind) {
    case "NO_MEMBER":
      throw new NotFoundError(`Member not found${suffix}`);

    case "NO_LOAN":
      throw new NotFoundError(`Loan not found${suffix}`);

    case "LOAN_MEMBER_MISMATCH":
      throw new ValidationError(`Loan does not belong to this member${suffix}`);

    case "NO_INSTALLMENT":
      throw new NotFoundError(`Installment not found for this loan${suffix}`);

    case "INACTIVE_LOAN":
      throw new ConflictError(
        `Payments can only be collected for active loans${suffix}`,
      );

    case "INSTALLMENT_PAID":
      throw new ConflictError(`This installment is already paid${suffix}`);

    case "OVERPAY":
      throw new ValidationError(
        `Loan collection amount cannot exceed the installment remaining balance${suffix}`,
      );

    case "UPCOMING":
      throw new ValidationError(
        `Upcoming installments require advance-payment confirmation${suffix}`,
      );

    case "SAVINGS_ACCOUNT_CLOSED":
      throw new ConflictError(`Savings account is closed${suffix}`);

    case "CONCURRENT":
      throw new ConflictError(
        `Financial data changed while processing the collection; please retry${suffix}`,
      );

    case "SUCCESS":
      return;
  }
};

/**
 * Create a single collection.
 *
 * Can contain:
 * - Loan payment
 * - General savings
 * - Special savings
 * - Any valid combination of the above
 */
export const createCollection = async (
  data: CreateCollectionInput,
  authenticatedUserId: number,
) => {
  const result = await repository.createCollection(data, authenticatedUserId);

  assertCollectionResult(result);

  return result;
};

/**
 * Create multiple collections from the
 * daily collection sheet.
 */
export const createBatchCollections = async (
  data: BatchCollectionInput,
  authenticatedUserId: number,
) => {
  const result = await repository.createBatchCollections(
    data,
    authenticatedUserId,
  );

  assertCollectionResult(result);

  return result;
};

/**
 * Get installments due on a selected date.
 */
export const getDueInstallments = (dueDate: Date) =>
  repository.findDueInstallments(dueDate);

/**
 * Collection history filters.
 */
export type CollectionListFilters = {
  memberId?: number;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

/**
 * Get collection history.
 */
export const getCollections = (filters: CollectionListFilters) =>
  repository.findCollections(filters);

/**
 * Get a single collection receipt/details.
 */
export const getCollectionById = async (collectionId: number) => {
  const collection = await repository.findCollectionById(collectionId);

  if (!collection) {
    throw new NotFoundError("Collection not found");
  }

  return collection;
};
