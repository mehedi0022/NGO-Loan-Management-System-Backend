import { Temporal } from "temporal-polyfill";
import { db } from "../../prisma/db.js";
import { ConflictError, ValidationError } from "../../errors/AppError.js";
import { calculateLoan } from "../loan/utils/loan-calculation.util.js";
import { generateInstallmentSchedule } from "../loan/utils/installment-schedule.util.js";
import { calculateDpsMaturity } from "../dps/dps.repository.js";
import type {
  MigrateSingleMemberInput,
  MigrateSingleResult,
} from "./migration.types.js";

export const migrateSingleMember = async (
  data: MigrateSingleMemberInput,
  userId: number,
): Promise<MigrateSingleResult> => {
  return db.transaction(async (tx: any) => {
    // 1. Uniqueness checks
    if (data.nidNumber && data.nidNumber.trim()) {
      const existingNid = await tx.orm.public.Member.select("id", "fullName").first({
        nidNumber: data.nidNumber.trim(),
      });
      if (existingNid) {
        throw new ConflictError(
          `Member with NID ${data.nidNumber} already exists (${existingNid.fullName})`,
        );
      }
    }

    if (data.memberId && data.memberId.trim()) {
      const existingMemberId = await tx.orm.public.Member.select("id", "fullName").first({
        memberId: data.memberId.trim(),
      });
      if (existingMemberId) {
        throw new ConflictError(
          `Member ID '${data.memberId}' is already in use by ${existingMemberId.fullName}`,
        );
      }
    }

    if (data.somitiId) {
      const somiti = await tx.orm.public.Somiti.select("id", "name").first({
        id: data.somitiId,
      });
      if (!somiti) {
        throw new ValidationError(`Somiti with ID ${data.somitiId} not found`);
      }
    }

    // 2. Prepare join date
    const joinDateObj = data.joinDate ? new Date(data.joinDate) : new Date();
    const joinDateInstant = Temporal.Instant.from(joinDateObj.toISOString());

    // 3. Create Member
    const createdMember = await tx.orm.public.Member.create({
      fullName: data.fullName.trim(),
      fatherName: data.fatherName.trim(),
      motherName: data.motherName.trim(),
      guardianName: data.guardianName?.trim() || null,
      mobileNumber: data.mobileNumber.trim(),
      nidNumber: data.nidNumber?.trim() || null,
      email: data.email?.trim() || null,
      occupation: data.occupation?.trim() || null,
      somitiId: data.somitiId || null,
      joinDate: joinDateInstant,
      admissionFee: String(data.admissionFee || "0"),
      notes: data.notes?.trim() || "Legacy Member Migration",
      status: "ACTIVE",
    });

    const finalMemberCode = data.memberId?.trim()
      ? data.memberId.trim()
      : `AC-${String(createdMember.id).padStart(5, "0")}`;

    await tx.orm.public.Member.where({ id: createdMember.id }).update({
      memberId: finalMemberCode,
    });

    // 4. Create Addresses
    if (data.addresses && data.addresses.length > 0) {
      for (const addr of data.addresses) {
        await tx.orm.public.MemberAddress.create({
          memberId: createdMember.id,
          type: addr.type || "PRESENT",
          houseOrHolding: addr.houseOrHolding?.trim() || null,
          road: addr.road?.trim() || null,
          village: addr.village.trim(),
          postOffice: addr.postOffice.trim(),
          union: addr.union?.trim() || null,
          upazila: addr.upazila.trim(),
          district: addr.district.trim(),
          division: addr.division?.trim() || null,
        });
      }
    }

    // 5. Create Guarantors (optional)
    if (data.guarantors && data.guarantors.length > 0) {
      for (const g of data.guarantors) {
        await tx.orm.public.Guarantor.create({
          memberId: createdMember.id,
          fullName: g.fullName.trim(),
          fatherName: g.fatherName?.trim() || null,
          motherName: g.motherName?.trim() || null,
          mobileNumber: g.mobileNumber.trim(),
          nidNumber: g.nidNumber?.trim() || null,
          relationship: g.relationship.trim(),
          houseOrHolding: g.houseOrHolding?.trim() || null,
          road: g.road?.trim() || null,
          village: g.village?.trim() || null,
          postOffice: g.postOffice?.trim() || null,
          union: g.union?.trim() || null,
          upazila: g.upazila?.trim() || null,
          district: g.district?.trim() || null,
          division: g.division?.trim() || null,
          occupation: g.occupation?.trim() || null,
          notes: g.notes?.trim() || null,
        });
      }
    }

    // 6. Savings Account & Initial Opening Balance
    const genBal = Number(data.savings?.generalSavingsBalance || 0);
    const specBal = Number(data.savings?.specialSavingsBalance || 0);
    const savingsOpenDate = data.savings?.openedAt ? new Date(data.savings.openedAt) : joinDateObj;
    const savingsOpenInstant = Temporal.Instant.from(savingsOpenDate.toISOString());

    const createdSavingsAccount = await tx.orm.public.SavingsAccount.create({
      memberId: createdMember.id,
      generalSavingsBalance: genBal.toFixed(2),
      specialSavingsBalance: specBal.toFixed(2),
      status: "ACTIVE",
      openedAt: savingsOpenInstant,
    });

    const savingsAccountId = `SAV-${String(createdSavingsAccount.id).padStart(6, "0")}`;
    await tx.orm.public.SavingsAccount.where({ id: createdSavingsAccount.id }).update({
      accountId: savingsAccountId,
    });

    // Record Opening Balance Transactions in member passbook without cash ledger deduction
    if (genBal > 0) {
      const txCode = `STX-${String(createdSavingsAccount.id).padStart(4, "0")}01`;
      await tx.orm.public.SavingsTransaction.create({
        savingsAccountId: createdSavingsAccount.id,
        savingsType: "GENERAL",
        type: "DEPOSIT",
        amount: genBal.toFixed(2),
        balanceBefore: "0.00",
        balanceAfter: genBal.toFixed(2),
        transactionDate: savingsOpenInstant,
        paymentMethod: "CASH",
        reference: "OPENING_BALANCE",
        notes: "Opening balance from legacy migration",
        processedById: userId,
        transactionId: txCode,
      });
    }

    if (specBal > 0) {
      const txCode = `STX-${String(createdSavingsAccount.id).padStart(4, "0")}02`;
      await tx.orm.public.SavingsTransaction.create({
        savingsAccountId: createdSavingsAccount.id,
        savingsType: "SPECIAL",
        type: "DEPOSIT",
        amount: specBal.toFixed(2),
        balanceBefore: "0.00",
        balanceAfter: specBal.toFixed(2),
        transactionDate: savingsOpenInstant,
        paymentMethod: "CASH",
        reference: "OPENING_BALANCE",
        notes: "Special savings opening balance from legacy migration",
        processedById: userId,
        transactionId: txCode,
      });
    }

    let loanResult: MigrateSingleResult["loan"] | undefined;

    // 7. Ongoing Loan Migration (Optional)
    if (data.loan && data.loan.principalAmount > 0) {
      const loanData = data.loan;

      // Custom loan code check
      if (loanData.loanId && loanData.loanId.trim()) {
        const existingLoanId = await tx.orm.public.Loan.select("id").first({
          loanId: loanData.loanId.trim(),
        });
        if (existingLoanId) {
          throw new ConflictError(`Loan ID '${loanData.loanId}' already exists`);
        }
      }

      const calculation = calculateLoan({
        principalAmount: loanData.principalAmount,
        chargeType: loanData.chargeType || "PERCENTAGE",
        chargeValue: loanData.chargeValue || 0,
        installmentCount: loanData.installmentCount,
      });

      let effectiveInstallmentAmount = calculation.installmentAmount;
      if (loanData.installmentAmount !== undefined && loanData.installmentAmount > 0) {
        if (loanData.installmentCount > 1) {
          const regularCount = loanData.installmentCount - 1;
          const regularTotalInPaisa =
            Math.round(loanData.installmentAmount * 100) * regularCount;
          const totalPayableInPaisa = Math.round(calculation.totalPayable * 100);
          const remainderInPaisa = totalPayableInPaisa - regularTotalInPaisa;

          if (remainderInPaisa <= 0) {
            throw new ValidationError(
              `Regular installment amount (৳${loanData.installmentAmount}) is too high for migrated loan. Total payable is ৳${calculation.totalPayable}, leaving ৳${(remainderInPaisa / 100).toFixed(2)} for the final installment.`,
            );
          }
        }
        effectiveInstallmentAmount = loanData.installmentAmount;
      }

      const firstDueDateStr = new Date(loanData.firstDueDate).toISOString().slice(0, 10);
      const firstDueDatePlain = Temporal.PlainDate.from(firstDueDateStr);

      const schedule = generateInstallmentSchedule({
        totalPayable: calculation.totalPayable.toFixed(2),
        installmentCount: loanData.installmentCount,
        installmentAmount: effectiveInstallmentAmount.toFixed(2),
        frequency: loanData.frequency || "WEEKLY",
        firstDueDate: firstDueDatePlain,
      });

      const disburseDateObj = new Date(loanData.disbursementDate);
      const disburseInstant = Temporal.Instant.from(disburseDateObj.toISOString());
      const firstDueInstant = Temporal.Instant.from(`${firstDueDatePlain.toString()}T00:00:00Z`);

      const maturityPlain = schedule[schedule.length - 1].dueDate;
      const maturityInstant = Temporal.Instant.from(`${maturityPlain.toString()}T00:00:00Z`);

      const paidCount = Math.min(loanData.paidInstallments || 0, loanData.installmentCount);
      const loanStatus = paidCount >= loanData.installmentCount ? "COMPLETED" : "ACTIVE";

      const createdLoan = await tx.orm.public.Loan.create({
        memberId: createdMember.id,
        principalAmount: loanData.principalAmount.toFixed(2),
        chargeType: loanData.chargeType || "PERCENTAGE",
        chargeValue: (loanData.chargeValue || 0).toFixed(2),
        chargeAmount: calculation.chargeAmount.toFixed(2),
        totalPayable: calculation.totalPayable.toFixed(2),
        installmentCount: loanData.installmentCount,
        installmentAmount: effectiveInstallmentAmount.toFixed(2),
        frequency: loanData.frequency || "WEEKLY",
        applicationDate: disburseInstant,
        disbursementDate: disburseInstant,
        firstDueDate: firstDueInstant,
        maturityDate: maturityInstant,
        status: loanStatus,
        purpose: loanData.purpose || "Legacy Loan Migration",
        notes: loanData.notes || `Migrated loan with ${paidCount} pre-paid installments`,
        approvedAt: disburseInstant,
        approvedById: userId,
      });

      const loanCode = loanData.loanId?.trim()
        ? loanData.loanId.trim()
        : `LN-${String(createdLoan.id).padStart(6, "0")}`;

      await tx.orm.public.Loan.where({ id: createdLoan.id }).update({
        loanId: loanCode,
      });

      // Insert Installments
      for (const inst of schedule) {
        const isPaid = inst.installmentNo <= paidCount;
        const instDueInstant = Temporal.Instant.from(`${inst.dueDate.toString()}T00:00:00Z`);

        await tx.orm.public.LoanInstallment.create({
          loanId: createdLoan.id,
          installmentNo: inst.installmentNo,
          dueDate: instDueInstant,
          amount: inst.amount,
          paidAmount: isPaid ? inst.amount : "0.00",
          status: isPaid ? "PAID" : "PENDING",
          paidAt: isPaid ? instDueInstant : null,
        });
      }

      loanResult = {
        id: createdLoan.id,
        loanId: loanCode,
        status: loanStatus,
        principalAmount: loanData.principalAmount,
        totalPayable: calculation.totalPayable,
        paidInstallments: paidCount,
        remainingInstallments: loanData.installmentCount - paidCount,
      };
    }

    let dpsResult: MigrateSingleResult["dps"] | undefined;

    // 8. Ongoing DPS Migration (Optional)
    if (data.dps && data.dps.installmentAmount > 0) {
      const dpsData = data.dps;

      if (dpsData.dpsNumber && dpsData.dpsNumber.trim()) {
        const existingDps = await tx.orm.public.DpsAccount.select("id").first({
          dpsNumber: dpsData.dpsNumber.trim(),
        });
        if (existingDps) {
          throw new ConflictError(`DPS Number '${dpsData.dpsNumber}' already exists`);
        }
      }

      const frequency = dpsData.frequency || "MONTHLY";
      const isWeekly = frequency === "WEEKLY";

      const { totalPrincipal, maturityAmount, installmentCount } = calculateDpsMaturity(
        dpsData.installmentAmount,
        dpsData.durationMonths,
        dpsData.interestRate,
        frequency,
      );

      const startDateObj = new Date(dpsData.startDate);
      const startPlain = Temporal.PlainDate.from(startDateObj.toISOString().slice(0, 10));
      const startInstant = Temporal.Instant.from(`${startPlain.toString()}T00:00:00Z`);

      const maturityPlain = isWeekly
        ? startPlain.add({ weeks: installmentCount })
        : startPlain.with({ day: 1 }).add({ months: dpsData.durationMonths }).with({
            day: Math.min(
              startPlain.day,
              startPlain.with({ day: 1 }).add({ months: dpsData.durationMonths }).daysInMonth,
            ),
          });
      const maturityInstant = Temporal.Instant.from(`${maturityPlain.toString()}T00:00:00Z`);

      const paidCount = Math.min(dpsData.paidInstallments || 0, installmentCount);
      const totalPaid = (paidCount * dpsData.installmentAmount).toFixed(2);
      const dpsStatus = paidCount >= installmentCount ? "MATURED" : "ACTIVE";

      const createdDps = await tx.orm.public.DpsAccount.create({
        memberId: createdMember.id,
        frequency,
        installmentAmount: dpsData.installmentAmount.toFixed(2),
        durationMonths: dpsData.durationMonths,
        interestRate: dpsData.interestRate.toFixed(2),
        totalPrincipal,
        maturityAmount,
        totalPaidAmount: totalPaid,
        paidInstallments: paidCount,
        startDate: startInstant,
        maturityDate: maturityInstant,
        status: dpsStatus,
        notes: dpsData.notes || `Legacy DPS Migration (${paidCount} pre-paid installments)`,
        openedById: userId,
      });

      const dpsCode = dpsData.dpsNumber?.trim()
        ? dpsData.dpsNumber.trim()
        : `DPS-${String(createdDps.id).padStart(6, "0")}`;

      await tx.orm.public.DpsAccount.where({ id: createdDps.id }).update({
        dpsNumber: dpsCode,
      });

      // Insert DPS Installments
      for (let i = 1; i <= installmentCount; i += 1) {
        const isPaid = i <= paidCount;
        const instPlain = isWeekly
          ? startPlain.add({ weeks: i - 1 })
          : startPlain.with({ day: 1 }).add({ months: i - 1 }).with({
              day: Math.min(
                startPlain.day,
                startPlain.with({ day: 1 }).add({ months: i - 1 }).daysInMonth,
              ),
            });
        const instDueInstant = Temporal.Instant.from(`${instPlain.toString()}T00:00:00Z`);

        await tx.orm.public.DpsInstallment.create({
          dpsAccountId: createdDps.id,
          installmentNo: i,
          dueDate: instDueInstant,
          amount: dpsData.installmentAmount.toFixed(2),
          paidAmount: isPaid ? dpsData.installmentAmount.toFixed(2) : "0.00",
          status: isPaid ? "PAID" : "PENDING",
          paidAt: isPaid ? instDueInstant : null,
        });
      }

      dpsResult = {
        id: createdDps.id,
        dpsNumber: dpsCode,
        status: dpsStatus,
        installmentAmount: dpsData.installmentAmount,
        paidInstallments: paidCount,
        totalPaid: Number(totalPaid),
      };
    }

    return {
      success: true,
      memberId: createdMember.id,
      memberCode: finalMemberCode,
      fullName: createdMember.fullName,
      savingsAccount: {
        id: createdSavingsAccount.id,
        accountId: savingsAccountId,
        generalBalance: genBal,
        specialBalance: specBal,
      },
      loan: loanResult,
      dps: dpsResult,
    };
  });
};
