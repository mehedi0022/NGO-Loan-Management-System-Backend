import { db } from "../../../prisma/db.js";
import { or } from "@prisma/orm-postgres/orm-client";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  CreateSomitiInput,
  SomitiListQuery,
  UpdateSomitiInput,
} from "../somiti.types.js";

const somitiFields = [
  "id",
  "somitiId",
  "name",
  "code",
  "meetingDay",
  "meetingTime",
  "fieldOfficerId",
  "village",
  "union",
  "upazila",
  "district",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const createSomiti = async (data: CreateSomitiInput) => {
  return db.orm.public.Somiti.select(...somitiFields)
    .include("fieldOfficer", (officer) =>
      officer.select("id", "fullName", "userName", "email", "role"),
    )
    .create({
      name: data.name,
      code: data.code || null,
      meetingDay: data.meetingDay,
      meetingTime: data.meetingTime || null,
      fieldOfficerId: data.fieldOfficerId || null,
      village: data.village || null,
      union: data.union || null,
      upazila: data.upazila || null,
      district: data.district || null,
      status: data.status || "ACTIVE",
    });
};

export const updateSomitiId = async (id: number, somitiId: string) => {
  return db.orm.public.Somiti.where({ id })
    .select(...somitiFields)
    .update({ somitiId });
};

export const findSomitiById = async (id: number) => {
  return db.orm.public.Somiti.select(...somitiFields)
    .include("fieldOfficer", (officer) =>
      officer.select("id", "fullName", "userName", "email", "role"),
    )
    .first({ id });
};

export const findSomitiByCode = async (code: string) => {
  return db.orm.public.Somiti.select(...somitiFields).first({ code });
};

export const countSomitiMembers = async (somitiId: number) => {
  const { count } = await db.orm.public.Member.where({ somitiId }).aggregate(
    (aggregate) => ({
      count: aggregate.count(),
    }),
  );
  return count;
};

export const findSomities = async ({
  page,
  limit,
  search,
  status,
  meetingDay,
  fieldOfficerId,
  sortBy,
  sortOrder,
}: SomitiListQuery) => {
  const selectedSomities = db.orm.public.Somiti.select(...somitiFields).include(
    "fieldOfficer",
    (officer) => officer.select("id", "fullName", "userName", "email", "role"),
  );

  let filteredSomities = selectedSomities;

  if (status && status !== "ALL") {
    filteredSomities = filteredSomities.where({ status });
  }

  if (meetingDay && meetingDay !== "ALL") {
    filteredSomities = filteredSomities.where({ meetingDay });
  }

  if (fieldOfficerId) {
    filteredSomities = filteredSomities.where({ fieldOfficerId });
  }

  if (search) {
    const term = `%${search}%`;
    filteredSomities = filteredSomities.where((somiti) =>
      or(
        somiti.name.ilike(term),
        somiti.code.ilike(term),
        somiti.somitiId.ilike(term),
        somiti.village.ilike(term),
      ),
    );
  }

  let somitiesQuery = filteredSomities;

  if (sortBy === "name") {
    somitiesQuery = somitiesQuery.orderBy((somiti) =>
      sortOrder === "asc" ? somiti.name.asc() : somiti.name.desc(),
    );
  } else if (sortBy === "code") {
    somitiesQuery = somitiesQuery.orderBy((somiti) =>
      sortOrder === "asc" ? somiti.code.asc() : somiti.code.desc(),
    );
  } else if (sortBy === "meetingDay") {
    somitiesQuery = somitiesQuery.orderBy((somiti) =>
      sortOrder === "asc" ? somiti.meetingDay.asc() : somiti.meetingDay.desc(),
    );
  } else if (sortBy === "id") {
    somitiesQuery = somitiesQuery.orderBy((somiti) =>
      sortOrder === "asc" ? somiti.id.asc() : somiti.id.desc(),
    );
  } else {
    somitiesQuery = somitiesQuery.orderBy((somiti) =>
      sortOrder === "asc" ? somiti.createdAt.asc() : somiti.createdAt.desc(),
    );
  }

  const offset = pageOffset(page, limit);

  const [{ total }, somities] = await Promise.all([
    filteredSomities.aggregate((aggregate) => ({
      total: aggregate.count(),
    })),
    somitiesQuery.offset(offset).limit(limit).all(),
  ]);

  // Fetch member counts for the returned somities
  const somitiesWithCounts = await Promise.all(
    somities.map(async (somiti) => {
      const { count } = await db.orm.public.Member.where({
        somitiId: somiti.id,
      }).aggregate((aggregate) => ({ count: aggregate.count() }));
      return {
        ...somiti,
        memberCount: count,
      };
    }),
  );

  return {
    somities: somitiesWithCounts,
    meta: paginationMeta(page, limit, total),
  };
};

export const findAllActiveSomities = async (fieldOfficerId?: number) => {
  let query = db.orm.public.Somiti.where({ status: "ACTIVE" })
    .select(
      "id",
      "somitiId",
      "name",
      "code",
      "meetingDay",
      "meetingTime",
      "fieldOfficerId",
      "village",
      "union",
      "upazila",
      "district",
    )
    .include("fieldOfficer", (officer) =>
      officer.select("id", "fullName", "userName", "email", "role"),
    );

  if (fieldOfficerId) {
    query = query.where({ fieldOfficerId });
  }

  return query
    .orderBy((somiti) => somiti.name.asc())
    .all();
};

export const updateSomiti = async (id: number, data: UpdateSomitiInput) => {
  return db.orm.public.Somiti.where({ id })
    .select(...somitiFields)
    .include("fieldOfficer", (officer) =>
      officer.select("id", "fullName", "userName", "email", "role"),
    )
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code || null }),
      ...(data.meetingDay !== undefined && { meetingDay: data.meetingDay }),
      ...(data.meetingTime !== undefined && {
        meetingTime: data.meetingTime || null,
      }),
      ...(data.fieldOfficerId !== undefined && {
        fieldOfficerId: data.fieldOfficerId || null,
      }),
      ...(data.village !== undefined && { village: data.village || null }),
      ...(data.union !== undefined && { union: data.union || null }),
      ...(data.upazila !== undefined && { upazila: data.upazila || null }),
      ...(data.district !== undefined && { district: data.district || null }),
      ...(data.status !== undefined && { status: data.status }),
    });
};

export const deleteSomitiById = async (id: number) => {
  return db.orm.public.Somiti.where({ id }).delete();
};

export const findSomitiMembers = async (
  somitiId: number,
  page = 1,
  limit = 20,
) => {
  const baseQuery = db.orm.public.Member.where({ somitiId });

  const [{ total }, members] = await Promise.all([
    baseQuery.aggregate((aggregate) => ({ total: aggregate.count() })),
    baseQuery
      .select(
        "id",
        "memberId",
        "fullName",
        "fatherName",
        "guardianName",
        "mobileNumber",
        "status",
        "joinDate",
        "photoUrl",
      )
      .include("savingsAccount", (savings) =>
        savings.select(
          "id",
          "accountId",
          "generalSavingsBalance",
          "specialSavingsBalance",
        ),
      )
      .include("dpsAccounts", (dps) =>
        dps
          .select(
            "id",
            "dpsNumber",
            "status",
            "installmentAmount",
            "totalPaidAmount",
            "paidInstallments",
            "durationMonths",
          )
          .where({ status: "ACTIVE" }),
      )
      .orderBy((member) => member.createdAt.desc())
      .offset(pageOffset(page, limit))
      .limit(limit)
      .all(),
  ]);

  return {
    members,
    meta: paginationMeta(page, limit, total),
  };
};
