import type { UserRole } from "./roles.js";

export const permissions = {
  // Dashboard
  dashboardRead: "dashboard:read",

  // Users
  usersReadAny: "users:read:any",
  usersCreate: "users:create",
  usersUpdateAny: "users:update:any",
  usersChangeRole: "users:change-role:any",
  usersChangeStatus: "users:change-status:any",
  usersResetPassword: "users:reset-password:any",

  // Somities
  somitiesReadAny: "somities:read:any",
  somitiesCreate: "somities:create",
  somitiesUpdateAny: "somities:update:any",
  somitiesDeleteAny: "somities:delete:any",

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
  loansReverse: "loans:reverse",

  // Collections
  collectionsReadAny: "collections:read:any",
  collectionsCreate: "collections:create",
  collectionsReverse: "collections:reverse",

  // Savings
  savingsReadAny: "savings:read:any",
  savingsDeposit: "savings:deposit",
  savingsWithdraw: "savings:withdraw",
  savingsReverse: "savings:reverse",

  // DPS
  dpsReadAny: "dps:read:any",
  dpsCreate: "dps:create",
  dpsDeposit: "dps:deposit",
  dpsClose: "dps:close",
  dpsReverse: "dps:reverse",

  // Reports
  reportsReadAny: "reports:read:any",

  // Income & Expense
  incomeExpenseReadAny: "income-expense:read:any",
  incomeExpenseCreate: "income-expense:create",
  incomeExpenseUpdateAny: "income-expense:update:any",
  incomeExpenseDeleteAny: "income-expense:delete:any",

  // Accounts
  accountsReadAny: "accounts:read:any",
  accountsCreate: "accounts:create",
  accountsUpdateAny: "accounts:update:any",
  accountsTransfer: "accounts:transfer",
  accountsInjectCapital: "accounts:inject-capital",

  // Settings
  settingsRead: "settings:read",
  settingsUpdate: "settings:update",
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
    permissions.usersChangeStatus,
    permissions.usersResetPassword,

    // Somities
    permissions.somitiesReadAny,
    permissions.somitiesCreate,
    permissions.somitiesUpdateAny,
    permissions.somitiesDeleteAny,

    // Members
    permissions.membersReadAny,
    permissions.membersCreate,
    permissions.membersUpdateAny,

    // Loans
    permissions.loansReadAny,
    permissions.loansCreate,
    permissions.loansUpdateAny,
    permissions.loansApprove,
    permissions.loansDisburse,
    permissions.loansReverse,

    // Collections
    permissions.collectionsReadAny,
    permissions.collectionsCreate,
    permissions.collectionsReverse,

    // Savings
    permissions.savingsReadAny,
    permissions.savingsDeposit,
    permissions.savingsWithdraw,
    permissions.savingsReverse,

    // DPS
    permissions.dpsReadAny,
    permissions.dpsCreate,
    permissions.dpsDeposit,
    permissions.dpsClose,
    permissions.dpsReverse,

    // Reports
    permissions.reportsReadAny,

    // Income & Expense
    permissions.incomeExpenseReadAny,
    permissions.incomeExpenseCreate,
    permissions.incomeExpenseUpdateAny,
    permissions.incomeExpenseDeleteAny,

    // Accounts
    permissions.accountsReadAny,
    permissions.accountsCreate,
    permissions.accountsUpdateAny,
    permissions.accountsTransfer,
    permissions.accountsInjectCapital,

    // Settings
    permissions.settingsRead,
    permissions.settingsUpdate,
  ]),

  // Daily operational manager access
  MANAGER: new Set([
    // Dashboard
    permissions.dashboardRead,

    // Somities
    permissions.somitiesReadAny,
    permissions.somitiesCreate,
    permissions.somitiesUpdateAny,

    // Members
    permissions.membersReadAny,
    permissions.membersCreate,
    permissions.membersUpdateAny,

    // Loans
    permissions.loansReadAny,
    permissions.loansCreate,
    permissions.loansUpdateAny,
    permissions.loansApprove,
    permissions.loansDisburse,

    // Collections
    permissions.collectionsReadAny,
    permissions.collectionsCreate,

    // Savings
    permissions.savingsReadAny,
    permissions.savingsDeposit,
    permissions.savingsWithdraw,

    // DPS
    permissions.dpsReadAny,
    permissions.dpsCreate,
    permissions.dpsDeposit,
    permissions.dpsClose,

    // Reports
    permissions.reportsReadAny,

    // Income & Expense
    permissions.incomeExpenseReadAny,
    permissions.incomeExpenseCreate,
    permissions.incomeExpenseUpdateAny,

    // Accounts
    permissions.accountsReadAny,
    permissions.accountsCreate,
    permissions.accountsUpdateAny,
    permissions.accountsTransfer,
    permissions.accountsInjectCapital,

    // Settings
    permissions.settingsRead,
  ]),

  // Field officer operational access
  FIELD_OFFICER: new Set([
    // Dashboard
    permissions.dashboardRead,

    // Somities
    permissions.somitiesReadAny,

    // Members
    permissions.membersReadAny,
    permissions.membersCreate,
    permissions.membersUpdateAny,

    // Loans
    permissions.loansReadAny,
    permissions.loansCreate,

    // Collections
    permissions.collectionsReadAny,
    permissions.collectionsCreate,

    // Savings
    permissions.savingsReadAny,
    permissions.savingsDeposit,
    permissions.savingsWithdraw,

    // DPS
    permissions.dpsReadAny,
    permissions.dpsCreate,
    permissions.dpsDeposit,
    permissions.dpsClose,

    // Reports
    permissions.reportsReadAny,

    // Income & Expense
    permissions.incomeExpenseReadAny,
    permissions.incomeExpenseCreate,

    // Accounts
    permissions.accountsReadAny,

    // Settings
    permissions.settingsRead,
  ]),
};

export const roleHasPermission = (role: UserRole, permission: Permission) =>
  rolePermissions[role].has(permission);

export const getPermissionsForRole = (role: UserRole): Permission[] =>
  [...rolePermissions[role]];
