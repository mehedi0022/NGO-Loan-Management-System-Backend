import { db } from "../../../prisma/db.js";
import { or } from "@prisma/orm-postgres/orm-client";
import type {
  CreateMemberInput,
  MemberListQuery,
  MemberFinancialHistoryQuery,
  UpdateMemberInput,
} from "../member.types.js";
import { Temporal } from "temporal-polyfill";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";

/**
 * Find all members
 */
export const findAllMembers = async ({
  page,
  limit,
  status,
  search,
  district,
  sortBy,
  sortOrder,
}: MemberListQuery) => {
  const selectedMembers = db.orm.public.Member.select(
    "id",
    "memberId",
    "fullName",
    "fatherName",
    "motherName",
    "guardianName",
    "mobileNumber",
    "nidNumber",
    "email",
    "photoUrl",
    "occupation",
    "joinDate",
    "status",
    "notes",
    "createdAt",
    "updatedAt",
  );

  let filteredMembers = selectedMembers;

  // Status filter
  if (status) {
    filteredMembers = filteredMembers.where({
      status,
    });
  }

  // Search
  if (search) {
    const searchTerm = search.trim();

    filteredMembers = filteredMembers.where((member) =>
      or(
        member.fullName.ilike(`%${searchTerm}%`),
        member.memberId.ilike(`%${searchTerm}%`),
        member.mobileNumber.ilike(`%${searchTerm}%`),
        member.nidNumber.ilike(`%${searchTerm}%`),
      ),
    );
  }

  const offset = pageOffset(page, limit);

  const membersQuery = (() => {
    switch (sortBy) {
      case "id":
        return filteredMembers.orderBy((member) =>
          sortOrder === "asc" ? member.id.asc() : member.id.desc(),
        );

      case "memberId":
        return filteredMembers.orderBy([
          (member) =>
            sortOrder === "asc"
              ? member.memberId.asc()
              : member.memberId.desc(),
          (member) => member.id.asc(),
        ]);

      case "fullName":
        return filteredMembers.orderBy([
          (member) =>
            sortOrder === "asc"
              ? member.fullName.asc()
              : member.fullName.desc(),
          (member) => member.id.asc(),
        ]);

      case "joinDate":
        return filteredMembers.orderBy([
          (member) =>
            sortOrder === "asc"
              ? member.joinDate.asc()
              : member.joinDate.desc(),
          (member) => member.id.desc(),
        ]);

      case "createdAt":
      default:
        return filteredMembers.orderBy([
          (member) =>
            sortOrder === "asc"
              ? member.createdAt.asc()
              : member.createdAt.desc(),
          (member) => member.id.desc(),
        ]);
    }
  })();

  const [{ total }, members] = await Promise.all([
    filteredMembers.aggregate((aggregate) => ({
      total: aggregate.count(),
    })),

    membersQuery.offset(offset).limit(limit).all(),
  ]);

  return {
    members,
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * Find member by ID
 */
export const findMemberById = async (id: number) => {
  // 1. Member
  const member = await db.orm.public.Member.select(
    "id",
    "memberId",
    "fullName",
    "fatherName",
    "motherName",
    "guardianName",
    "mobileNumber",
    "nidNumber",
    "email",
    "photoUrl",
    "occupation",
    "joinDate",
    "status",
    "notes",
    "createdAt",
    "updatedAt",
  )
    .include("loans", (loans) =>
      loans
        .select(
          "id",
          "loanId",
          "memberId",
          "principalAmount",
          "totalPayable",
          "installmentCount",
          "frequency",
          "applicationDate",
          "disbursementDate",
          "firstDueDate",
          "maturityDate",
          "status",
        )
        .include("installments", (installments) =>
          installments.select(
            "id",
            "loanId",
            "installmentNo",
            "dueDate",
            "amount",
            "paidAmount",
            "status",
            "paidAt",
          ),
        ),
    )
    .include("savingsAccount", (account) =>
      account.select(
        "id",
        "accountId",
        "generalSavingsBalance",
        "specialSavingsBalance",
        "status",
        "openedAt",
        "closedAt",
      ),
    )
    .first({ id });

  if (!member) {
    return null;
  }

  // 2. Address + Guarantor
  const [addresses, guarantors] = await Promise.all([
    db.orm.public.MemberAddress.select(
      "id",
      "memberId",
      "type",
      "houseOrHolding",
      "road",
      "village",
      "postOffice",
      "union",
      "upazila",
      "district",
      "division",
      "createdAt",
      "updatedAt",
    )
      .where({
        memberId: id,
      })
      .all(),

    db.orm.public.Guarantor.select(
      "id",
      "memberId",
      "fullName",
      "fatherName",
      "motherName",
      "mobileNumber",
      "nidNumber",
      "relationship",
      "houseOrHolding",
      "road",
      "village",
      "postOffice",
      "union",
      "upazila",
      "district",
      "division",
      "occupation",
      "notes",
      "createdAt",
      "updatedAt",
    )
      .where({
        memberId: id,
      })
      .all(),
  ]);

  return {
    ...member,
    addresses,
    guarantors,
  };
};
/**
 * Find member by Member ID
 */
export const findMemberByMemberId = async (memberId: string) => {
  return db.orm.public.Member.select(
    "id",
    "memberId",
    "fullName",
    "mobileNumber",
    "status",
  ).first({ memberId });
};

/**
 * Find member by NID
 */
export const findMemberByNid = async (nidNumber: string) => {
  return db.orm.public.Member.select(
    "id",
    "memberId",
    "fullName",
    "nidNumber",
  ).first({ nidNumber });
};

export const updateMemberId = async (id: number, memberId: string) => {
  return db.orm.public.Member.where({ id })
    .select(
      "id",
      "memberId",
      "fullName",
      "fatherName",
      "motherName",
      "guardianName",
      "mobileNumber",
      "nidNumber",
      "email",
      "photoUrl",
      "occupation",
      "joinDate",
      "status",
      "notes",
      "createdAt",
      "updatedAt",
    )
    .update({
      memberId,
    });
};
/**
 * Create member
 *
 * memberId should be generated by the service/repository strategy.
 * addresses and guarantors are intentionally not passed directly
 * until relation creation is implemented.
 */
export const createMember = async (data: CreateMemberInput) => {
  return db.transaction(async (tx) => {
    // 1. Create member
    const member = await tx.orm.public.Member.select(
      "id",
      "memberId",
      "fullName",
      "fatherName",
      "motherName",
      "guardianName",
      "mobileNumber",
      "nidNumber",
      "email",
      "photoUrl",
      "occupation",
      "joinDate",
      "status",
      "notes",
      "createdAt",
      "updatedAt",
    ).create({
      fullName: data.fullName,
      fatherName: data.fatherName,
      motherName: data.motherName,
      guardianName: data.guardianName,
      mobileNumber: data.mobileNumber,
      nidNumber: data.nidNumber,
      email: data.email,
      photoUrl: data.photoUrl,
      occupation: data.occupation,

      joinDate: data.joinDate
        ? Temporal.Instant.from(data.joinDate.toISOString())
        : undefined,

      notes: data.notes,
    });

    // 2. Create addresses
    // PRESENT required
    // FATHER_HOME optional
    for (const address of data.addresses) {
      await tx.orm.public.MemberAddress.create({
        memberId: member.id,
        type: address.type,
        houseOrHolding: address.houseOrHolding,
        road: address.road,
        village: address.village,
        postOffice: address.postOffice,
        union: address.union,
        upazila: address.upazila,
        district: address.district,
        division: address.division,
      });
    }

    // 3. Create guarantors - optional
    if (data.guarantors?.length) {
      for (const guarantor of data.guarantors) {
        await tx.orm.public.Guarantor.create({
          memberId: member.id,
          fullName: guarantor.fullName,
          fatherName: guarantor.fatherName,
          motherName: guarantor.motherName,
          mobileNumber: guarantor.mobileNumber,
          nidNumber: guarantor.nidNumber,
          relationship: guarantor.relationship,

          houseOrHolding: guarantor.houseOrHolding,
          road: guarantor.road,
          village: guarantor.village,
          postOffice: guarantor.postOffice,
          union: guarantor.union,
          upazila: guarantor.upazila,
          district: guarantor.district,
          division: guarantor.division,

          occupation: guarantor.occupation,
          notes: guarantor.notes,
        });
      }
    }

    return member;
  });
};
/**
 * Update member
 */
export const updateMemberById = async (id: number, data: UpdateMemberInput) => {
  const { addresses, guarantors, joinDate, ...memberData } = data;

  return db.transaction(async (tx) => {
    // 1. Update basic member information
    const member = await tx.orm.public.Member.where({
      id,
    })
      .select(
        "id",
        "memberId",
        "fullName",
        "fatherName",
        "motherName",
        "guardianName",
        "mobileNumber",
        "nidNumber",
        "email",
        "photoUrl",
        "occupation",
        "joinDate",
        "status",
        "notes",
        "createdAt",
        "updatedAt",
      )
      .update({
        ...memberData,

        ...(joinDate !== undefined && {
          joinDate: Temporal.Instant.from(joinDate.toISOString()),
        }),
      });

    if (!member) {
      return null;
    }

    // 2. Sync addresses only when supplied
    if (addresses !== undefined) {
      const existingAddresses = await tx.orm.public.MemberAddress.select(
        "id",
        "memberId",
        "type",
      )
        .where({
          memberId: id,
        })
        .all();

      const presentAddress = addresses.find(
        (address) => address.type === "PRESENT",
      );

      const fatherAddress = addresses.find(
        (address) => address.type === "FATHER_HOME",
      );

      const existingPresent = existingAddresses.find(
        (address) => address.type === "PRESENT",
      );

      const existingFather = existingAddresses.find(
        (address) => address.type === "FATHER_HOME",
      );

      // PRESENT ADDRESS
      if (presentAddress) {
        const { type: _type, ...presentData } = presentAddress;

        if (existingPresent) {
          await tx.orm.public.MemberAddress.where({
            id: existingPresent.id,
          }).update({
            ...presentData,
            type: "PRESENT",
          });
        } else {
          await tx.orm.public.MemberAddress.create({
            memberId: id,
            type: "PRESENT",
            ...presentData,
          });
        }
      }

      // FATHER ADDRESS
      if (fatherAddress) {
        const { type: _type, ...fatherData } = fatherAddress;

        if (existingFather) {
          await tx.orm.public.MemberAddress.where({
            id: existingFather.id,
          }).update({
            ...fatherData,
            type: "FATHER_HOME",
          });
        } else {
          await tx.orm.public.MemberAddress.create({
            memberId: id,
            type: "FATHER_HOME",
            ...fatherData,
          });
        }
      } else if (existingFather) {
        // Checkbox turned OFF
        await tx.orm.public.MemberAddress.where({
          id: existingFather.id,
        }).delete();
      }
    }

    // 3. Sync guarantor only when supplied
    if (guarantors !== undefined) {
      const existingGuarantors = await tx.orm.public.Guarantor.select(
        "id",
        "memberId",
      )
        .where({
          memberId: id,
        })
        .all();

      const incomingGuarantor = guarantors[0];

      const existingGuarantor = existingGuarantors[0];

      if (incomingGuarantor) {
        if (existingGuarantor) {
          await tx.orm.public.Guarantor.where({
            id: existingGuarantor.id,
          }).update({
            ...incomingGuarantor,
          });
        } else {
          await tx.orm.public.Guarantor.create({
            memberId: id,
            ...incomingGuarantor,
          });
        }
      } else {
        // Guarantor checkbox turned OFF
        for (const guarantor of existingGuarantors) {
          await tx.orm.public.Guarantor.where({
            id: guarantor.id,
          }).delete();
        }
      }
    }

    return member;
  });
};

export const findMemberLoanPayments = async (
  memberId: number,
  { page, limit, sortOrder }: MemberFinancialHistoryQuery,
) => {
  const member = await db.orm.public.Member.select("id")
    .include("loans", (loans) => loans.select("id"))
    .first({ id: memberId });

  if (!member) return null;

  const loanIds = member.loans.map((loan) => loan.id);
  if (!loanIds.length) {
    return { payments: [], meta: paginationMeta(page, limit, 0) };
  }

  const selectedPayments = db.orm.public.LoanPayment.select(
    "id",
    "paymentId",
    "loanId",
    "installmentId",
    "amount",
    "paymentDate",
    "paymentMethod",
    "reference",
    "notes",
    "createdAt",
  )
    .include("loan", (loan) => loan.select("id", "loanId"))
    .include("installment", (installment) =>
      installment.select("id", "installmentNo"),
    )
    .where((payment) => payment.loanId.in(loanIds));

  const paymentsQuery = selectedPayments.orderBy([
    (payment) =>
      sortOrder === "asc"
        ? payment.paymentDate.asc()
        : payment.paymentDate.desc(),
    (payment) =>
      sortOrder === "asc" ? payment.id.asc() : payment.id.desc(),
  ]);

  const [{ total }, payments] = await Promise.all([
    selectedPayments.aggregate((aggregate) => ({ total: aggregate.count() })),
    paymentsQuery.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);

  return { payments, meta: paginationMeta(page, limit, total) };
};

export const findMemberSavingsTransactions = async (
  memberId: number,
  { page, limit, sortOrder }: MemberFinancialHistoryQuery,
) => {
  const member = await db.orm.public.Member.select("id")
    .include("savingsAccount", (account) => account.select("id"))
    .first({ id: memberId });

  if (!member) return null;

  if (!member.savingsAccount) {
    return { transactions: [], meta: paginationMeta(page, limit, 0) };
  }

  const selectedTransactions = db.orm.public.SavingsTransaction.select(
    "id",
    "transactionId",
    "savingsAccountId",
    "collectionId",
    "processedById",
    "savingsType",
    "type",
    "amount",
    "balanceBefore",
    "balanceAfter",
    "transactionDate",
    "paymentMethod",
    "reference",
    "notes",
    "createdAt",
  )
    .include("processedBy", (user) => user.select("id", "userName", "fullName"))
    .where({ savingsAccountId: member.savingsAccount.id });

  const transactionsQuery = selectedTransactions.orderBy([
    (transaction) =>
      sortOrder === "asc"
        ? transaction.transactionDate.asc()
        : transaction.transactionDate.desc(),
    (transaction) =>
      sortOrder === "asc" ? transaction.id.asc() : transaction.id.desc(),
  ]);

  const [{ total }, transactions] = await Promise.all([
    selectedTransactions.aggregate((aggregate) => ({
      total: aggregate.count(),
    })),
    transactionsQuery.offset(pageOffset(page, limit)).limit(limit).all(),
  ]);

  return { transactions, meta: paginationMeta(page, limit, total) };
};

export const updateMemberPhotoUrl = async (id: number, photoUrl: string) =>
  db.orm.public.Member.where({ id })
    .select(
      "id",
      "memberId",
      "fullName",
      "fatherName",
      "motherName",
      "guardianName",
      "mobileNumber",
      "nidNumber",
      "email",
      "photoUrl",
      "occupation",
      "joinDate",
      "status",
      "notes",
      "createdAt",
      "updatedAt",
    )
    .update({ photoUrl });

/**
 * Delete member
 */
export const deleteMemberById = async (id: number) => {
  return db.orm.public.Member.where({ id })
    .select("id", "memberId", "fullName", "mobileNumber", "status")
    .delete();
};
