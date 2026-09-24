import { describe, expect, it } from "vitest";

import {
  resetUserPasswordSchema,
  userListQuerySchema,
} from "../../src/modules/user/validations/user.validation.js";

describe("user password reset validation", () => {
  it("accepts a strong temporary password", () => {
    expect(
      resetUserPasswordSchema.safeParse({
        params: { id: "3" },
        body: { newPassword: "Temporary!Pass1" },
      }).success,
    ).toBe(true);
  });

  it.each(["short", "alllowercase1!", "ALLUPPERCASE1!", "NoNumber!", "NoSpecial1"])(
    "rejects weak password %s",
    (newPassword) => {
      expect(
        resetUserPasswordSchema.safeParse({
          params: { id: 3 },
          body: { newPassword },
        }).success,
      ).toBe(false);
    },
  );
});

describe("user list query validation", () => {
  it("accepts search, role, status, pagination, and safe sorting", () => {
    const result = userListQuerySchema.safeParse({
      query: {
        search: "  admin@example.com  ",
        role: "ADMIN",
        status: "ACTIVE",
        page: "2",
        limit: "10",
        sortBy: "fullName",
        sortOrder: "asc",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toMatchObject({
        search: "admin@example.com",
        role: "ADMIN",
        status: "ACTIVE",
        page: 2,
        limit: 10,
        sortBy: "fullName",
        sortOrder: "asc",
      });
    }
  });

  it("rejects unknown status and sort fields", () => {
    expect(
      userListQuerySchema.safeParse({
        query: { status: "SUSPENDED", sortBy: "password" },
      }).success,
    ).toBe(false);
  });
});
