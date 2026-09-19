import { describe, expect, it } from "vitest";

import { errorResponse, paginatedResponse, successResponse } from "../../src/utils/api-response.js";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, pageOffset, paginationMeta } from "../../src/utils/pagination.js";

describe("shared API response contracts", () => {
  it("creates stable success, error, and paginated response shapes", () => {
    expect(successResponse("Done", { id: 1 })).toEqual({
      success: true,
      message: "Done",
      data: { id: 1 },
    });
    expect(errorResponse("Invalid", "VALIDATION_ERROR", { requestId: "request-1" })).toEqual({
      success: false,
      message: "Invalid",
      code: "VALIDATION_ERROR",
      requestId: "request-1",
    });
    expect(paginatedResponse("Users", [{ id: 1 }], paginationMeta(2, 20, 41))).toEqual({
      success: true,
      message: "Users",
      data: [{ id: 1 }],
      meta: { page: 2, limit: 20, total: 41, totalPages: 3 },
    });
  });

  it("uses bounded pagination defaults and a zero-based database offset", () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(20);
    expect(MAX_PAGE_LIMIT).toBe(100);
    expect(pageOffset(1, 20)).toBe(0);
    expect(pageOffset(3, 20)).toBe(40);
  });
});
