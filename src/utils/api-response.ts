export type SuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = SuccessResponse<T[]> & {
  meta: PaginationMeta;
};

export type ErrorResponse = {
  success: false;
  message: string;
  code: string;
  requestId?: string;
  details?: unknown;
};

export const successResponse = <T>(message: string, data: T): SuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const paginatedResponse = <T>(
  message: string,
  data: T[],
  meta: PaginationMeta,
): PaginatedResponse<T> => ({
  ...successResponse(message, data),
  meta,
});

export const errorResponse = (
  message: string,
  code: string,
  options: Omit<ErrorResponse, "success" | "message" | "code"> = {},
): ErrorResponse => ({
  success: false,
  message,
  code,
  ...options,
});
