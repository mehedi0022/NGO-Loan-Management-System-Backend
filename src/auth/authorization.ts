import type { UserRole } from "./roles.js";

export const permissions = {
  // Dashboard
  dashboardRead: "dashboard:read",

  // Users
  usersReadAny: "users:read:any",
  usersCreate: "users:create",
  usersUpdateAny: "users:update:any",
  usersDeleteAny: "users:delete:any",

  // Members
  membersReadAny: "members:read:any",
  membersCreate: "members:create",
  membersUpdateAny: "members:update:any",
  membersDeleteAny: "members:delete:any",

  // Loans
  loansReadAny: "loans:read:any",
  loansCreate: "loans:create",
  loansUpdateAny: "loans:update:any",
  loansApprove: "loans:approve:any",
  loansDisburse: "loans:disburse:any",

  // Collections
  collectionsReadAny: "collections:read:any",
  collectionsCreate: "collections:create",
  collectionsReverse: "collections:reverse",

  // Savings
  savingsReadAny: "savings:read:any",
  savingsDeposit: "savings:deposit",
  savingsWithdraw: "savings:withdraw",

  // Reports
  reportsReadAny: "reports:read:any",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

const rolePermissions: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  // Everything
  SUPER_ADMIN: new Set(Object.values(permissions)),

  // Almost everything except destructive/sensitive operations
  ADMIN: new Set([
    // Dashboard
    permissions.dashboardRead,

    // Users
    permissions.usersReadAny,
    permissions.usersCreate,
    permissions.usersUpdateAny,

    // Members
    permissions.membersReadAny,
    permissions.membersCreate,
    permissions.membersUpdateAny,

    // Loans
    permissions.loansReadAny,
    permissions.loansCreate,
    permissions.loansUpdateAny,

    // Collections
    permissions.collectionsReadAny,
    permissions.collectionsCreate,
    permissions.collectionsReverse,

    // Savings
    permissions.savingsReadAny,
    permissions.savingsDeposit,
    permissions.savingsWithdraw,

    // Reports
    permissions.reportsReadAny,
  ]),

  // Daily operational access
  MANAGER: new Set([
    // Dashboard
    permissions.dashboardRead,

    // Members
    permissions.membersReadAny,
    permissions.membersCreate,
    permissions.membersUpdateAny,

    // Loans
    permissions.loansReadAny,
    permissions.loansCreate,
    permissions.loansUpdateAny,

    // Collections
    permissions.collectionsReadAny,
    permissions.collectionsCreate,

    // Savings
    permissions.savingsReadAny,
    permissions.savingsDeposit,
    permissions.savingsWithdraw,

    // Reports
    permissions.reportsReadAny,
  ]),
};

export const roleHasPermission = (role: UserRole, permission: Permission) =>
  rolePermissions[role].has(permission);
