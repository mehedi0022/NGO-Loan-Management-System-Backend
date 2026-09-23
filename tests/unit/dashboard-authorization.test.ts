import { describe, expect, it } from "vitest";

import {
  permissions,
  roleHasPermission,
} from "../../src/auth/authorization.js";

describe("dashboard authorization", () => {
  it.each(["SUPER_ADMIN", "ADMIN", "MANAGER"] as const)(
    "allows the %s role to read the operational dashboard",
    (role) => {
      expect(roleHasPermission(role, permissions.dashboardRead)).toBe(true);
    },
  );
});
