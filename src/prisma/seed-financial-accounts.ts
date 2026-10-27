import "dotenv/config";
import { db } from "./db.js";

export const seedFinancialAccounts = async () => {
  console.log("Checking Financial Accounts...");

  const existingDefault = await db.orm.public.FinancialAccount.select("id", "accountName", "currentBalance")
    .first({ isDefault: true });

  if (!existingDefault) {
    const mainCash = await db.orm.public.FinancialAccount.select("id", "accountName").create({
      accountName: "Branch Main Cash",
      accountType: "CASH",
      currentBalance: "0",
      isDefault: true,
      isActive: true,
      notes: "Default operational cash drawer for branch collections and disbursements",
    });

    console.log(`Created default account: ${mainCash.accountName} (ID: ${mainCash.id}) with initial balance 0`);
  } else {
    console.log(`Default Financial Account already exists: ${existingDefault.accountName} (Balance: ${existingDefault.currentBalance})`);
  }
};

seedFinancialAccounts()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
