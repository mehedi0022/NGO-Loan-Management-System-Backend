import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../src/modules/user/repositories/user.repository.js",
  () => ({
    findUserIdByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    updateUserById: vi.fn(),
    countActiveSuperAdmins: vi.fn(),
    updateUserRoleById: vi.fn(),
    updateUserStatusAndRevokeSessions: vi.fn(),
  }),
);

vi.mock("../../src/utils/password.util.js", () => ({
  hashPassword: vi.fn(),
}));

vi.mock(
  "../../src/modules/auth/repositories/account-token.repository.js",
  () => ({ changePasswordAndRevokeSessions: vi.fn() }),
);

import { ConflictError } from "../../src/errors/AppError.js";
import * as userRepository from "../../src/modules/user/repositories/user.repository.js";
import {
  changeUserRole as createRoleChange,
  changeUserStatus,
  createUser,
  resetUserPassword,
} from "../../src/modules/user/services/user.service.js";
import { hashPassword } from "../../src/utils/password.util.js";
import * as accountTokenRepository from "../../src/modules/auth/repositories/account-token.repository.js";

const findUserIdByEmail = vi.mocked(userRepository.findUserIdByEmail);
const persistUser = vi.mocked(userRepository.createUser);
const findUserById = vi.mocked(userRepository.findUserById);
const countActiveSuperAdmins = vi.mocked(userRepository.countActiveSuperAdmins);
const updateUserRoleById = vi.mocked(userRepository.updateUserRoleById);
const updateUserStatus = vi.mocked(
  userRepository.updateUserStatusAndRevokeSessions,
);
const hashUserPassword = vi.mocked(hashPassword);
const persistResetPassword = vi.mocked(
  accountTokenRepository.changePasswordAndRevokeSessions,
);

describe("user service createUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findUserIdByEmail.mockResolvedValue(null);
    hashUserPassword.mockResolvedValue("argon2id-hash");
    persistUser.mockResolvedValue({
      id: 10,
      email: "admin@example.com",
      userName: "admin.user",
      fullName: "Admin User",
      role: "ADMIN",
      isActive: true,
      emailVerifiedAt: null,
      createdAt: "2026-09-24T00:00:00.000Z",
      updatedAt: "2026-09-24T00:00:00.000Z",
    });
  });

  it("normalizes email, hashes the password, and persists the requested role", async () => {
    const result = await createUser("SUPER_ADMIN", {
      userName: "admin.user",
      fullName: "Admin User",
      email: "  ADMIN@Example.COM ",
      password: "Strong!Pass1",
      role: "ADMIN",
    });

    expect(findUserIdByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(hashUserPassword).toHaveBeenCalledWith("Strong!Pass1");
    expect(persistUser).toHaveBeenCalledWith({
      userName: "admin.user",
      fullName: "Admin User",
      email: "admin@example.com",
      password: "argon2id-hash",
      role: "ADMIN",
    });
    expect(result).not.toHaveProperty("password");
  });

  it("uses MANAGER when no role is supplied", async () => {
    await createUser("ADMIN", {
      userName: "manager.user",
      fullName: "Manager User",
      email: "manager@example.com",
      password: "Strong!Pass1",
    });

    expect(persistUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: "MANAGER" }),
    );
  });

  it("prevents ADMIN from creating an equal or higher role", async () => {
    await expect(
      createUser("ADMIN", {
        userName: "another.admin",
        fullName: "Another Admin",
        email: "another.admin@example.com",
        password: "Strong!Pass1",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_ERROR" });

    expect(findUserIdByEmail).not.toHaveBeenCalled();
    expect(persistUser).not.toHaveBeenCalled();
  });

  it("rejects an email that already exists before hashing", async () => {
    findUserIdByEmail.mockResolvedValue({ id: 1 });

    await expect(
      createUser("SUPER_ADMIN", {
        userName: "duplicate.user",
        fullName: "Duplicate User",
        email: "DUPLICATE@example.com",
        password: "Strong!Pass1",
        role: "MANAGER",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(hashUserPassword).not.toHaveBeenCalled();
    expect(persistUser).not.toHaveBeenCalled();
  });
});

describe("user service status changes", () => {
  const manager = {
    id: 3,
    email: "manager@example.com",
    userName: "manager.user",
    fullName: "Manager User",
    role: "MANAGER" as const,
    isActive: true,
    emailVerifiedAt: null,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    findUserById.mockResolvedValue(manager);
    updateUserStatus.mockResolvedValue({ ...manager, isActive: false });
  });

  it("allows ADMIN to deactivate a MANAGER", async () => {
    const result = await changeUserStatus(
      { userId: 2, role: "ADMIN" },
      3,
      false,
    );

    expect(updateUserStatus).toHaveBeenCalledWith(3, false);
    expect(result.isActive).toBe(false);
  });

  it("prevents self-deactivation", async () => {
    await expect(
      changeUserStatus({ userId: 3, role: "MANAGER" }, 3, false),
    ).rejects.toThrow("You cannot deactivate your own account");
    expect(updateUserStatus).not.toHaveBeenCalled();
  });

  it("prevents ADMIN from changing another ADMIN status", async () => {
    findUserById.mockResolvedValue({ ...manager, id: 4, role: "ADMIN" });

    await expect(
      changeUserStatus({ userId: 2, role: "ADMIN" }, 4, false),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_ERROR" });
    expect(updateUserStatus).not.toHaveBeenCalled();
  });

  it("prevents deactivating the last active SUPER_ADMIN", async () => {
    findUserById.mockResolvedValue({
      ...manager,
      id: 1,
      role: "SUPER_ADMIN",
    });
    countActiveSuperAdmins.mockResolvedValue(1);

    await expect(
      changeUserStatus({ userId: 2, role: "SUPER_ADMIN" }, 1, false),
    ).rejects.toThrow("The last active SUPER_ADMIN cannot be deactivated");
    expect(updateUserStatus).not.toHaveBeenCalled();
  });
});

describe("user service role changes", () => {
  const superAdmin = {
    id: 1,
    email: "super@example.com",
    userName: "super.admin",
    fullName: "Super Admin",
    role: "SUPER_ADMIN" as const,
    isActive: true,
    emailVerifiedAt: null,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    findUserById.mockResolvedValue(superAdmin);
    countActiveSuperAdmins.mockResolvedValue(2);
    updateUserRoleById.mockResolvedValue({ ...superAdmin, role: "ADMIN" });
  });

  it("prevents a SUPER_ADMIN from demoting their own account", async () => {
    await expect(
      createRoleChange({ userId: 1, role: "SUPER_ADMIN" }, 1, "ADMIN"),
    ).rejects.toThrow("You cannot change your own role");
    expect(updateUserRoleById).not.toHaveBeenCalled();
  });

  it("prevents demoting the last active SUPER_ADMIN", async () => {
    countActiveSuperAdmins.mockResolvedValue(1);

    await expect(
      createRoleChange({ userId: 2, role: "SUPER_ADMIN" }, 1, "ADMIN"),
    ).rejects.toThrow("The last active SUPER_ADMIN cannot be demoted");
    expect(updateUserRoleById).not.toHaveBeenCalled();
  });

  it("allows another SUPER_ADMIN to demote when one remains active", async () => {
    const result = await createRoleChange(
      { userId: 2, role: "SUPER_ADMIN" },
      1,
      "ADMIN",
    );

    expect(updateUserRoleById).toHaveBeenCalledWith(1, "ADMIN");
    expect(result.role).toBe("ADMIN");
  });
});

describe("user service password reset", () => {
  const manager = {
    id: 3,
    email: "manager@example.com",
    userName: "manager.user",
    fullName: "Manager User",
    role: "MANAGER" as const,
    isActive: true,
    emailVerifiedAt: null,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    findUserById.mockResolvedValue(manager);
    hashUserPassword.mockResolvedValue("argon2id-reset-hash");
    persistResetPassword.mockResolvedValue(true);
  });

  it("allows ADMIN to reset a MANAGER password and revoke sessions", async () => {
    await resetUserPassword(
      { userId: 2, role: "ADMIN" },
      3,
      "Temporary!Pass1",
    );

    expect(hashUserPassword).toHaveBeenCalledWith("Temporary!Pass1");
    expect(persistResetPassword).toHaveBeenCalledWith({
      userId: 3,
      passwordHash: "argon2id-reset-hash",
      now: expect.anything(),
    });
  });

  it("requires the self-service endpoint for the actor's own password", async () => {
    await expect(
      resetUserPassword(
        { userId: 3, role: "SUPER_ADMIN" },
        3,
        "Temporary!Pass1",
      ),
    ).rejects.toThrow("Use the change-password endpoint");
    expect(hashUserPassword).not.toHaveBeenCalled();
  });

  it("prevents ADMIN from resetting another ADMIN password", async () => {
    findUserById.mockResolvedValue({ ...manager, id: 4, role: "ADMIN" });

    await expect(
      resetUserPassword(
        { userId: 2, role: "ADMIN" },
        4,
        "Temporary!Pass1",
      ),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_ERROR" });
    expect(hashUserPassword).not.toHaveBeenCalled();
  });
});
