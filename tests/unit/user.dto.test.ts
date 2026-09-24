import { describe, expect, it } from "vitest";

import { permissions } from "../../src/auth/authorization.js";
import {
  toAuthenticatedUserDto,
  toPublicUserDto,
} from "../../src/modules/user/user.dto.js";

const user = {
  id: 7,
  email: "admin@example.com",
  userName: "admin.user",
  fullName: "Admin User",
  role: "ADMIN" as const,
  isActive: true,
  emailVerifiedAt: null,
  createdAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
};

describe("user response DTOs", () => {
  it("adds server-resolved permissions only to authenticated-user responses", () => {
    const authenticated = toAuthenticatedUserDto(user);

    expect(authenticated.permissions).toEqual(
      expect.arrayContaining([
        permissions.dashboardRead,
        permissions.usersReadAny,
        permissions.usersCreate,
        permissions.usersChangeStatus,
      ]),
    );
    expect(authenticated.permissions).not.toContain(
      permissions.usersChangeRole,
    );
    expect(toPublicUserDto(user)).not.toHaveProperty("permissions");
  });

  it("never copies password fields into either DTO", () => {
    const record = { ...user, password: "secret-hash" };

    expect(toPublicUserDto(record)).not.toHaveProperty("password");
    expect(toAuthenticatedUserDto(record)).not.toHaveProperty("password");
  });
});
