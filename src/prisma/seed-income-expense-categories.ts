import "dotenv/config";
import { db } from "./db.js";

const DEFAULT_CATEGORIES = [
  // Income Categories
  { name: "Admission Fee", type: "INCOME" as const, description: "New member admission/registration fee", isSystem: true },
  { name: "Form & Passbook Fee", type: "INCOME" as const, description: "Loan form and savings passbook fee", isSystem: true },
  { name: "Loan Processing Fee", type: "INCOME" as const, description: "Loan application documentation and processing charge", isSystem: true },
  { name: "Late Penalty / Fine", type: "INCOME" as const, description: "Late installment payment fine and penalty", isSystem: true },
  { name: "Bank Profit / Interest", type: "INCOME" as const, description: "Interest and profit received from bank accounts", isSystem: true },
  { name: "Grant / Donation", type: "INCOME" as const, description: "Donor grants and institutional aid", isSystem: true },
  { name: "Member Welfare Fund", type: "INCOME" as const, description: "Contribution towards member emergency welfare fund", isSystem: true },
  { name: "Miscellaneous Income", type: "INCOME" as const, description: "Other general non-loan income", isSystem: true },

  // Expense Categories
  { name: "Staff Salary & Allowances", type: "EXPENSE" as const, description: "Field officers and office staff monthly salaries", isSystem: true },
  { name: "Office Rent", type: "EXPENSE" as const, description: "Branch and field office monthly rent", isSystem: true },
  { name: "Electricity & Utilities", type: "EXPENSE" as const, description: "Electricity, water, gas and utility bills", isSystem: true },
  { name: "Printing & Stationery", type: "EXPENSE" as const, description: "Passbooks, vouchers, loan forms, and stationery", isSystem: true },
  { name: "Conveyance & Travel", type: "EXPENSE" as const, description: "Field officer collection travel and transport allowance", isSystem: true },
  { name: "Entertainment & Refreshment", type: "EXPENSE" as const, description: "Official meetings, tea, and member refreshment", isSystem: true },
  { name: "Communication & Internet", type: "EXPENSE" as const, description: "Office internet, mobile allowances, and postal costs", isSystem: true },
  { name: "Office Maintenance & Repairs", type: "EXPENSE" as const, description: "Furniture, computer and office maintenance", isSystem: true },
  { name: "Bank Charges & Fees", type: "EXPENSE" as const, description: "Bank service charges and transaction fees", isSystem: true },
  { name: "Legal & Audit Fees", type: "EXPENSE" as const, description: "External auditor and legal advisor fees", isSystem: true },
  { name: "Miscellaneous Expense", type: "EXPENSE" as const, description: "Other general operational expenses", isSystem: true },
];

export const seedIncomeExpenseCategories = async () => {
  console.log("Seeding default Income & Expense categories...");

  let insertedCount = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db.orm.public.TransactionCategory.select("id")
      .first({
        name: cat.name,
        type: cat.type,
      });

    if (!existing) {
      await db.orm.public.TransactionCategory.select("id").create({
        name: cat.name,
        type: cat.type,
        description: cat.description,
        isSystem: cat.isSystem,
        isActive: true,
      });
      insertedCount++;
    }
  }

  console.log(`Seeding complete: ${insertedCount} new categories created (${DEFAULT_CATEGORIES.length - insertedCount} already existed).`);
};

seedIncomeExpenseCategories()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to seed categories:", err);
    process.exit(1);
  });
