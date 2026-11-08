import "dotenv/config";
import { Pool } from "pg";
import { Temporal } from "temporal-polyfill";
import { db, closeDatabase } from "./db.js";
import { config } from "../config/env.js";
import { hashPassword } from "../utils/password.util.js";
import { calculateLoan } from "../modules/loan/utils/loan-calculation.util.js";
import { generateInstallmentSchedule } from "../modules/loan/utils/installment-schedule.util.js";
import { calculateDpsMaturity } from "../modules/dps/dps.repository.js";

async function runResetAndSeed() {
  console.log("=================================================");
  console.log("   NGO SYSTEM DATABASE RESET & DEMO DATA SEED   ");
  console.log("=================================================\n");

  const pool = new Pool({
    connectionString: config.database.runtimeUrl,
    ssl:
      config.database.tls.mode === "disable"
        ? false
        : { rejectUnauthorized: true },
  });

  try {
    // 1. TRUNCATE ALL TABLES
    console.log("1. Truncating all tables with RESTART IDENTITY CASCADE...");
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tableNames = tablesRes.rows.map((r: any) => `"${r.table_name}"`);
    if (tableNames.length > 0) {
      await pool.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`);
    }
    console.log(`✓ All ${tableNames.length} tables truncated and IDs reset to 1.\n`);

    // 2. SEED ORGANIZATION SETTINGS
    console.log("2. Seeding Organization Settings...");
    await db.orm.public.OrganizationSetting.create({
      orgName: "Purbasha Financial Development Organization",
      orgShortName: "PFDO",
      registrationNo: "REG-NGO-2024-001",
      establishedYear: "2018",
      email: "info@purbasha.org",
      phone: "+8801700000000",
      address: "Main Road, Branch Office, Dhaka, Bangladesh",
      currencySymbol: "BDT",
      currencyCode: "BDT",
      defaultLoanChargeType: "PERCENTAGE",
      defaultLoanChargeValue: "10.00",
      defaultLoanFrequency: "WEEKLY",
      defaultGraceDays: 0,
      latePenaltyPercentage: "0.00",
      minGeneralSavingsDeposit: "50.00",
      minSpecialSavingsDeposit: "100.00",
    });
    console.log("✓ Organization settings seeded.\n");

    // 3. SEED FINANCIAL ACCOUNTS
    console.log("3. Seeding Financial Accounts (Cash & Bank)...");
    const mainCash = await db.orm.public.FinancialAccount.select(
      "id",
      "accountName",
    ).create({
      accountName: "Branch Main Cash",
      accountType: "CASH",
      currentBalance: "500000.00",
      isDefault: true,
      isActive: true,
      notes: "Default operational cash drawer for branch collections and disbursements",
    });

    const sonaliBank = await db.orm.public.FinancialAccount.select(
      "id",
      "accountName",
    ).create({
      accountName: "Sonali Bank PLC (A/C: 0123456789)",
      accountType: "BANK",
      currentBalance: "1000000.00",
      isDefault: false,
      isActive: true,
      notes: "Principal Bank Account for settlement & reserves",
    });

    const islamiBank = await db.orm.public.FinancialAccount.select(
      "id",
      "accountName",
    ).create({
      accountName: "Islami Bank Bangladesh PLC (A/C: 9876543210)",
      accountType: "BANK",
      currentBalance: "1500000.00",
      isDefault: false,
      isActive: true,
      notes: "Microfinance Islamic Banking Operations",
    });
    console.log("✓ 3 Financial Accounts created with BDT 3,000,000 total capital.\n");

    // 4. SEED USERS
    console.log("4. Seeding Demo Users (Password for all: 12345678)...");
    const defaultPasswordHash = await hashPassword("12345678");

    const superAdmin = await db.orm.public.User.select(
      "id",
      "fullName",
      "email",
      "role",
    ).create({
      fullName: "MD Mehedi Hassan",
      userName: "admin",
      email: "admin@meetmehedi.dev",
      password: defaultPasswordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    const manager = await db.orm.public.User.select(
      "id",
      "fullName",
      "email",
      "role",
    ).create({
      fullName: "Rafiqul Islam",
      userName: "manager",
      email: "manager@ngo.com",
      password: defaultPasswordHash,
      role: "MANAGER",
      isActive: true,
    });

    const officer1 = await db.orm.public.User.select(
      "id",
      "fullName",
      "email",
      "role",
    ).create({
      fullName: "Tariqul Islam",
      userName: "officer1",
      email: "officer1@ngo.com",
      password: defaultPasswordHash,
      role: "FIELD_OFFICER",
      isActive: true,
    });

    const officer2 = await db.orm.public.User.select(
      "id",
      "fullName",
      "email",
      "role",
    ).create({
      fullName: "Kamrul Hasan",
      userName: "officer2",
      email: "officer2@ngo.com",
      password: defaultPasswordHash,
      role: "FIELD_OFFICER",
      isActive: true,
    });
    console.log(`✓ 4 Users created:
      - Super Admin: admin@meetmehedi.dev (username: admin)
      - Manager:     manager@ngo.com     (username: manager)
      - Officer 1:   officer1@ngo.com    (username: officer1)
      - Officer 2:   officer2@ngo.com    (username: officer2)\n`);

    // 5. SEED TRANSACTION CATEGORIES
    console.log("5. Seeding Income & Expense Categories...");
    const incomeCategories = [
      { name: "Admission Fee", type: "INCOME" as const },
      { name: "Passbook & Form Sale", type: "INCOME" as const },
      { name: "Loan Service Charge / Profit", type: "INCOME" as const },
      { name: "Bank Profit / Interest", type: "INCOME" as const },
      { name: "Miscellaneous Income", type: "INCOME" as const },
    ];
    for (const cat of incomeCategories) {
      await db.orm.public.TransactionCategory.create({
        name: cat.name,
        type: cat.type,
        isActive: true,
      });
    }

    const expenseCategories = [
      { name: "Staff Salary & Allowances", type: "EXPENSE" as const },
      { name: "Office Rent", type: "EXPENSE" as const },
      { name: "Electricity & Utility Bills", type: "EXPENSE" as const },
      { name: "Printing, Stationery & Passbooks", type: "EXPENSE" as const },
      { name: "Field Travel & Conveyance", type: "EXPENSE" as const },
      { name: "Refreshment & Meeting Expense", type: "EXPENSE" as const },
    ];
    for (const cat of expenseCategories) {
      await db.orm.public.TransactionCategory.create({
        name: cat.name,
        type: cat.type,
        isActive: true,
      });
    }
    console.log("✓ Income and Expense Categories seeded.\n");

    // 6. SEED SOMITIES
    console.log("6. Seeding Somities (সমিতি)...");
    const somitiData = [
      {
        name: "Padma Mahila Somiti",
        code: "SOM-001",
        meetingDay: "SUNDAY" as const,
        meetingTime: "10:00 AM",
        fieldOfficerId: officer1.id,
        village: "Mirpur",
        upazila: "Mirpur",
        district: "Dhaka",
      },
      {
        name: "Meghna Krishi Somiti",
        code: "SOM-002",
        meetingDay: "MONDAY" as const,
        meetingTime: "11:30 AM",
        fieldOfficerId: officer1.id,
        village: "Savar",
        upazila: "Savar",
        district: "Dhaka",
      },
      {
        name: "Jamuna Khudra Byabshayi Somiti",
        code: "SOM-003",
        meetingDay: "WEDNESDAY" as const,
        meetingTime: "10:30 AM",
        fieldOfficerId: officer2.id,
        village: "Tongi",
        upazila: "Gazipur Sadar",
        district: "Gazipur",
      },
      {
        name: "Surma Progoti Somiti",
        code: "SOM-004",
        meetingDay: "THURSDAY" as const,
        meetingTime: "02:30 PM",
        fieldOfficerId: officer2.id,
        village: "Uttara",
        upazila: "Uttara",
        district: "Dhaka",
      },
    ];

    const somities: any[] = [];
    for (const s of somitiData) {
      const created = await db.orm.public.Somiti.select("id", "name", "meetingDay").create({
        ...s,
        somitiId: s.code,
      });
      somities.push(created);
    }
    console.log("✓ 4 Somities seeded with weekly meeting schedules.\n");

    // 7. SEED MEMBERS, SAVINGS, LOANS & DPS
    console.log("7. Seeding Members with Savings, Loans, and DPS...");

    const memberDefinitions = [
      // Somiti 1: Padma (Sunday) - Officer 1
      {
        somitiIdx: 0,
        fullName: "Fatema Begum",
        fatherName: "Abdur Rashid",
        motherName: "Rokeya Begum",
        guardianName: "Abul Kashem (Husband)",
        mobileNumber: "01712345601",
        nidNumber: "198826912345601",
        genSavings: 3500,
        spcSavings: 1200,
        loan: {
          type: "ACTIVE",
          principal: 40000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 8,
          weeksAgo: 8,
        },
        dps: {
          frequency: "WEEKLY" as const,
          amount: 500,
          durationMonths: 12,
          paid: 8,
          weeksAgo: 8,
        },
      },
      {
        somitiIdx: 0,
        fullName: "Nazma Khatun",
        fatherName: "Khorshed Alam",
        motherName: "Ayesha Khatun",
        guardianName: "Mokbul Hossain (Husband)",
        mobileNumber: "01712345602",
        nidNumber: "199026912345602",
        genSavings: 4200,
        spcSavings: 1500,
        loan: {
          type: "ACTIVE",
          principal: 60000,
          frequency: "MONTHLY" as const,
          count: 12,
          paid: 3,
          monthsAgo: 3,
        },
        dps: {
          frequency: "MONTHLY" as const,
          amount: 1000,
          durationMonths: 36,
          paid: 3,
          monthsAgo: 3,
        },
      },
      {
        somitiIdx: 0,
        fullName: "Shirin Akter",
        fatherName: "Mohammad Ali",
        motherName: "Hazera Begum",
        guardianName: "Jahangir Alam (Husband)",
        mobileNumber: "01712345603",
        nidNumber: "199226912345603",
        genSavings: 5000,
        spcSavings: 2000,
        loan: null, // NO LOAN - Ready to test Create Loan!
        dps: {
          frequency: "MONTHLY" as const,
          amount: 2000,
          durationMonths: 36,
          paid: 6,
          monthsAgo: 6,
        },
      },
      {
        somitiIdx: 0,
        fullName: "Parvin Sultana",
        fatherName: "Abdul Gafur",
        motherName: "Salma Begum",
        guardianName: "Saiful Islam (Husband)",
        mobileNumber: "01712345604",
        nidNumber: "199426912345604",
        genSavings: 2800,
        spcSavings: 800,
        loan: {
          type: "APPROVED", // APPROVED - Ready to test Disbursement!
          principal: 50000,
          frequency: "WEEKLY" as const,
          count: 46,
        },
        dps: null,
      },

      // Somiti 2: Meghna (Monday) - Officer 1
      {
        somitiIdx: 1,
        fullName: "Anwara Begum",
        fatherName: "Motaleb Hossain",
        motherName: "Zohra Bibi",
        guardianName: "Siraj Uddin (Husband)",
        mobileNumber: "01812345605",
        nidNumber: "198726912345605",
        genSavings: 3800,
        spcSavings: 1100,
        loan: {
          type: "ACTIVE",
          principal: 30000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 5,
          weeksAgo: 5,
        },
        dps: {
          frequency: "WEEKLY" as const,
          amount: 300,
          durationMonths: 12,
          paid: 5,
          weeksAgo: 5,
        },
      },
      {
        somitiIdx: 1,
        fullName: "Momena Khatun",
        fatherName: "Delwar Hossain",
        motherName: "Monowara Begum",
        guardianName: "Kalam Mia (Husband)",
        mobileNumber: "01812345606",
        nidNumber: "198926912345606",
        genSavings: 4500,
        spcSavings: 1600,
        loan: {
          type: "ACTIVE",
          principal: 50000,
          frequency: "MONTHLY" as const,
          count: 12,
          paid: 2,
          monthsAgo: 2,
        },
        dps: null,
      },
      {
        somitiIdx: 1,
        fullName: "Rehana Parvin",
        fatherName: "Sirajul Islam",
        motherName: "Rabeya Khatun",
        guardianName: "Alamgir Hossain (Husband)",
        mobileNumber: "01812345607",
        nidNumber: "199326912345607",
        genSavings: 2200,
        spcSavings: 500,
        loan: {
          type: "PENDING", // PENDING loan application
          principal: 45000,
          frequency: "WEEKLY" as const,
          count: 46,
        },
        dps: {
          frequency: "MONTHLY" as const,
          amount: 1000,
          durationMonths: 24,
          paid: 4,
          monthsAgo: 4,
        },
      },
      {
        somitiIdx: 1,
        fullName: "Kohinoor Begum",
        fatherName: "Nurul Huda",
        motherName: "Mahmuda Begum",
        guardianName: "Faruk Ahmed (Husband)",
        mobileNumber: "01812345608",
        nidNumber: "199126912345608",
        genSavings: 12500,
        spcSavings: 4500,
        loan: null, // NO LOAN - High savings!
        dps: null,
      },

      // Somiti 3: Jamuna (Wednesday) - Officer 2
      {
        somitiIdx: 2,
        fullName: "Rashida Banu",
        fatherName: "Abdul Jalil",
        motherName: "Khaleda Begum",
        guardianName: "Harunur Rashid (Husband)",
        mobileNumber: "01912345609",
        nidNumber: "198626912345609",
        genSavings: 5500,
        spcSavings: 2500,
        loan: {
          type: "ACTIVE",
          principal: 50000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 10,
          weeksAgo: 10,
        },
        dps: {
          frequency: "MONTHLY" as const,
          amount: 1500,
          durationMonths: 36,
          paid: 6,
          monthsAgo: 6,
        },
      },
      {
        somitiIdx: 2,
        fullName: "Kulsum Bibi",
        fatherName: "Hafizur Rahman",
        motherName: "Sufia Begum",
        guardianName: "Ziaur Rahman (Husband)",
        mobileNumber: "01912345610",
        nidNumber: "199526912345610",
        genSavings: 3900,
        spcSavings: 1400,
        loan: {
          type: "ACTIVE",
          principal: 40000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 12,
          weeksAgo: 12,
        },
        dps: null,
      },
      {
        somitiIdx: 2,
        fullName: "Shahana Akter",
        fatherName: "Gias Uddin",
        motherName: "Mariam Bibi",
        guardianName: "Babul Hossain (Husband)",
        mobileNumber: "01912345611",
        nidNumber: "199226912345611",
        genSavings: 6200,
        spcSavings: 3100,
        loan: {
          type: "COMPLETED", // COMPLETED loan - Can test that completed borrower CAN take new loan!
          principal: 30000,
          frequency: "WEEKLY" as const,
          count: 20,
          paid: 20,
          weeksAgo: 22,
        },
        dps: {
          frequency: "WEEKLY" as const,
          amount: 500,
          durationMonths: 12,
          paid: 10,
          weeksAgo: 10,
        },
      },
      {
        somitiIdx: 2,
        fullName: "Taslima Nasrin",
        fatherName: "Abdur Rahim",
        motherName: "Fatema Khatun",
        guardianName: "Mahmud Hasan (Husband)",
        mobileNumber: "01912345612",
        nidNumber: "199626912345612",
        genSavings: 4100,
        spcSavings: 1800,
        loan: null, // NO LOAN
        dps: {
          frequency: "WEEKLY" as const,
          amount: 500,
          durationMonths: 12,
          paid: 4,
          weeksAgo: 4,
        },
      },

      // Somiti 4: Surma (Thursday) - Officer 2
      {
        somitiIdx: 3,
        fullName: "Hasina Momtaz",
        fatherName: "Sultan Ahmed",
        motherName: "Razia Sultana",
        guardianName: "Nazrul Islam (Husband)",
        mobileNumber: "01612345613",
        nidNumber: "198526912345613",
        genSavings: 4800,
        spcSavings: 1900,
        loan: {
          type: "ACTIVE",
          principal: 35000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 4,
          weeksAgo: 4,
        },
        dps: {
          frequency: "MONTHLY" as const,
          amount: 1000,
          durationMonths: 36,
          paid: 5,
          monthsAgo: 5,
        },
      },
      {
        somitiIdx: 3,
        fullName: "Salma Jahan",
        fatherName: "Lutfur Rahman",
        motherName: "Jahanara Begum",
        guardianName: "Anisur Rahman (Husband)",
        mobileNumber: "01612345614",
        nidNumber: "198926912345614",
        genSavings: 7200,
        spcSavings: 2800,
        loan: {
          type: "ACTIVE",
          principal: 80000,
          frequency: "MONTHLY" as const,
          count: 12,
          paid: 4,
          monthsAgo: 4,
        },
        dps: null,
      },
      {
        somitiIdx: 3,
        fullName: "Naznin Akter",
        fatherName: "Bazlur Rahman",
        motherName: "Nasima Begum",
        guardianName: "Ashraful Islam (Husband)",
        mobileNumber: "01612345615",
        nidNumber: "199426912345615",
        genSavings: 8600,
        spcSavings: 3400,
        loan: null, // NO LOAN
        dps: {
          frequency: "MONTHLY" as const,
          amount: 3000,
          durationMonths: 36,
          paid: 8,
          monthsAgo: 8,
        },
      },
      {
        somitiIdx: 3,
        fullName: "Ruma Parvin",
        fatherName: "Mosharraf Hossain",
        motherName: "Shaheda Begum",
        guardianName: "Shahidul Islam (Husband)",
        mobileNumber: "01612345616",
        nidNumber: "199726912345616",
        genSavings: 3300,
        spcSavings: 1200,
        loan: {
          type: "ACTIVE",
          principal: 25000,
          frequency: "WEEKLY" as const,
          count: 46,
          paid: 6,
          weeksAgo: 6,
        },
        dps: null,
      },
    ];

    const todayPlain = Temporal.Now.plainDateISO();

    for (let idx = 0; idx < memberDefinitions.length; idx += 1) {
      const def = memberDefinitions[idx];
      const somiti = somities[def.somitiIdx];
      const memberCode = `MEM-${String(idx + 1).padStart(6, "0")}`;

      // Calculate realistic membership join date matching their loans/DPS history
      let memberJoinPlain = todayPlain.subtract({ months: 6 });
      if (def.loan?.weeksAgo) {
        memberJoinPlain = todayPlain.subtract({ weeks: def.loan.weeksAgo });
      } else if (def.loan?.monthsAgo) {
        memberJoinPlain = todayPlain.subtract({ months: def.loan.monthsAgo });
      } else if (def.dps?.monthsAgo) {
        memberJoinPlain = todayPlain.subtract({ months: def.dps.monthsAgo });
      } else if (def.dps?.weeksAgo) {
        memberJoinPlain = todayPlain.subtract({ weeks: def.dps.weeksAgo });
      }
      const memberJoinInstant = Temporal.Instant.from(`${memberJoinPlain.toString()}T00:00:00Z`);

      // A. Create Member
      const createdMember = await db.orm.public.Member.select(
        "id",
        "memberId",
        "fullName",
      ).create({
        memberId: memberCode,
        somitiId: somiti.id,
        fullName: def.fullName,
        fatherName: def.fatherName,
        motherName: def.motherName,
        guardianName: def.guardianName,
        mobileNumber: def.mobileNumber,
        nidNumber: def.nidNumber,
        status: "ACTIVE",
        admissionFee: "100.00",
        joinDate: memberJoinInstant,
        createdAt: memberJoinInstant,
      });

      // B. Create Member Address
      await db.orm.public.MemberAddress.create({
        memberId: createdMember.id,
        type: "PRESENT",
        village: somiti.village || "Main Village",
        postOffice: "Central Post",
        upazila: somiti.upazila || "Sadar",
        district: somiti.district || "Dhaka",
      });

      // C. Create Savings Account
      const savingsCode = `SAV-${String(createdMember.id).padStart(6, "0")}`;
      await db.orm.public.SavingsAccount.create({
        memberId: createdMember.id,
        accountId: savingsCode,
        generalSavingsBalance: def.genSavings.toFixed(2),
        specialSavingsBalance: def.spcSavings.toFixed(2),
        status: "ACTIVE",
        openedAt: memberJoinInstant,
        createdAt: memberJoinInstant,
      });

      // D. Create Loan (if any)
      if (def.loan) {
        const lDef = def.loan;
        const calc = calculateLoan({
          principalAmount: lDef.principal,
          chargeType: "PERCENTAGE",
          chargeValue: 10,
          installmentCount: lDef.count,
        });

        if (lDef.type === "APPROVED" || lDef.type === "PENDING") {
          const lCode = `LN-${String(idx + 1).padStart(6, "0")}`;
          await db.orm.public.Loan.create({
            loanId: lCode,
            memberId: createdMember.id,
            principalAmount: lDef.principal.toFixed(2),
            chargeType: "PERCENTAGE",
            chargeValue: "10.00",
            chargeAmount: calc.chargeAmount.toFixed(2),
            totalPayable: calc.totalPayable.toFixed(2),
            installmentCount: lDef.count,
            installmentAmount: calc.installmentAmount.toFixed(2),
            frequency: lDef.frequency,
            status: lDef.type,
            purpose: "Small Business / Agro Investment",
            approvedById: lDef.type === "APPROVED" ? manager.id : null,
            approvedAt: lDef.type === "APPROVED" ? Temporal.Now.instant() : null,
          });
        } else if (lDef.type === "ACTIVE" || lDef.type === "COMPLETED") {
          // Calculate start & first due dates based on weeksAgo or monthsAgo
          let disbPlain = todayPlain;
          if (lDef.weeksAgo) {
            disbPlain = todayPlain.subtract({ weeks: lDef.weeksAgo });
          } else if (lDef.monthsAgo) {
            disbPlain = todayPlain.subtract({ months: lDef.monthsAgo });
          }
          const firstDuePlain = disbPlain.add({ days: 7 });

          const schedule = generateInstallmentSchedule({
            totalPayable: calc.totalPayable.toFixed(2),
            installmentCount: lDef.count,
            installmentAmount: calc.installmentAmount.toFixed(2),
            frequency: lDef.frequency,
            firstDueDate: firstDuePlain,
          });

          const disbInstant = Temporal.Instant.from(`${disbPlain.toString()}T00:00:00Z`);
          const firstDueInstant = Temporal.Instant.from(`${firstDuePlain.toString()}T00:00:00Z`);
          const maturityPlain = schedule[schedule.length - 1].dueDate;
          const maturityInstant = Temporal.Instant.from(`${maturityPlain.toString()}T00:00:00Z`);

          const lCode = `LN-${String(idx + 1).padStart(6, "0")}`;
          const createdLoan = await db.orm.public.Loan.select("id").create({
            loanId: lCode,
            memberId: createdMember.id,
            principalAmount: lDef.principal.toFixed(2),
            chargeType: "PERCENTAGE",
            chargeValue: "10.00",
            chargeAmount: calc.chargeAmount.toFixed(2),
            totalPayable: calc.totalPayable.toFixed(2),
            installmentCount: lDef.count,
            installmentAmount: calc.installmentAmount.toFixed(2),
            frequency: lDef.frequency,
            status: lDef.type,
            purpose: "Small Business Support",
            disbursementDate: disbInstant,
            firstDueDate: firstDueInstant,
            maturityDate: maturityInstant,
            approvedById: manager.id,
            approvedAt: disbInstant,
          });

          // Insert Loan Installments
          const paidCount = lDef.paid || 0;
          for (const item of schedule) {
            const isPaid = item.installmentNo <= paidCount;
            const itemInstant = Temporal.Instant.from(`${item.dueDate.toString()}T00:00:00Z`);

            await db.orm.public.LoanInstallment.create({
              loanId: createdLoan.id,
              installmentNo: item.installmentNo,
              dueDate: itemInstant,
              amount: item.amount,
              paidAmount: isPaid ? item.amount : "0.00",
              status: isPaid ? "PAID" : "PENDING",
              paidAt: isPaid ? itemInstant : null,
            });
          }
        }
      }

      // E. Create DPS (if any)
      if (def.dps) {
        const dDef = def.dps;
        const dpsFreq = dDef.frequency;
        const isWk = dpsFreq === "WEEKLY";

        const { totalPrincipal, maturityAmount, installmentCount } =
          calculateDpsMaturity(dDef.amount, dDef.durationMonths, 8, dpsFreq);

        let dpsStartPlain = todayPlain;
        if (dDef.weeksAgo) {
          dpsStartPlain = todayPlain.subtract({ weeks: dDef.weeksAgo });
        } else if (dDef.monthsAgo) {
          dpsStartPlain = todayPlain.subtract({ months: dDef.monthsAgo });
        }

        const dpsStartInstant = Temporal.Instant.from(`${dpsStartPlain.toString()}T00:00:00Z`);
        const maturityPlain = isWk
          ? dpsStartPlain.add({ weeks: installmentCount })
          : dpsStartPlain.with({ day: 1 }).add({ months: dDef.durationMonths }).with({
              day: Math.min(
                dpsStartPlain.day,
                dpsStartPlain.with({ day: 1 }).add({ months: dDef.durationMonths }).daysInMonth,
              ),
            });
        const dpsMaturityInstant = Temporal.Instant.from(`${maturityPlain.toString()}T00:00:00Z`);

        const paidCount = Math.min(dDef.paid || 0, installmentCount);
        const totalPaid = (paidCount * dDef.amount).toFixed(2);
        const dpsCode = `DPS-${String(idx + 1).padStart(6, "0")}`;

        const createdDps = await db.orm.public.DpsAccount.select("id").create({
          dpsNumber: dpsCode,
          memberId: createdMember.id,
          frequency: dpsFreq,
          installmentAmount: dDef.amount.toFixed(2),
          durationMonths: dDef.durationMonths,
          interestRate: "8.00",
          totalPrincipal: totalPrincipal,
          maturityAmount: maturityAmount,
          totalPaidAmount: totalPaid,
          paidInstallments: paidCount,
          startDate: dpsStartInstant,
          maturityDate: dpsMaturityInstant,
          status: "ACTIVE",
          openedById: officer1.id,
        });

        // Insert DPS Installments
        for (let i = 1; i <= installmentCount; i += 1) {
          const isPaid = i <= paidCount;
          const instPlain = isWk
            ? dpsStartPlain.add({ weeks: i - 1 })
            : dpsStartPlain.with({ day: 1 }).add({ months: i - 1 }).with({
                day: Math.min(
                  dpsStartPlain.day,
                  dpsStartPlain.with({ day: 1 }).add({ months: i - 1 }).daysInMonth,
                ),
              });
          const instInstant = Temporal.Instant.from(`${instPlain.toString()}T00:00:00Z`);

          await db.orm.public.DpsInstallment.create({
            dpsAccountId: createdDps.id,
            installmentNo: i,
            dueDate: instInstant,
            amount: dDef.amount.toFixed(2),
            paidAmount: isPaid ? dDef.amount.toFixed(2) : "0.00",
            status: isPaid ? "PAID" : "PENDING",
            paidAt: isPaid ? instInstant : null,
          });
        }
      }
    }

    console.log("✓ 16 Members seeded with Savings, Active/Approved Loans, and DPS accounts.\n");

    console.log("=================================================");
    console.log("   DATABASE RESET & SEED COMPLETED SUCCESSFULLY!  ");
    console.log("=================================================");
  } catch (error) {
    console.error("Error running reset and seed:", error);
    throw error;
  } finally {
    await pool.end();
    await closeDatabase();
  }
}

runResetAndSeed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
