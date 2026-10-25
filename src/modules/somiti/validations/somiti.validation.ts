import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

export const somitiDays = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

export const somitiStatuses = ["ACTIVE", "INACTIVE"] as const;

export const createSomitiSchema = z.object({
  body: z
    .object({
      name: z
        .string("Somiti name is required")
        .trim()
        .min(2, "Somiti name must be at least 2 characters")
        .max(100, "Somiti name must be at most 100 characters"),
      code: z.string().trim().min(1).max(50).optional(),
      meetingDay: z.enum(somitiDays).default("SUNDAY"),
      meetingTime: z.string().trim().max(50).optional(),
      fieldOfficerId: z.coerce.number().int().positive().nullable().optional(),
      village: z.string().trim().max(100).optional(),
      union: z.string().trim().max(100).optional(),
      upazila: z.string().trim().max(100).optional(),
      district: z.string().trim().max(100).optional(),
      status: z.enum(somitiStatuses).default("ACTIVE"),
    })
    .strict(),
});

export const updateSomitiSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      code: z.string().trim().min(1).max(50).nullable().optional(),
      meetingDay: z.enum(somitiDays).optional(),
      meetingTime: z.string().trim().max(50).nullable().optional(),
      fieldOfficerId: z.coerce.number().int().positive().nullable().optional(),
      village: z.string().trim().max(100).nullable().optional(),
      union: z.string().trim().max(100).nullable().optional(),
      upazila: z.string().trim().max(100).nullable().optional(),
      district: z.string().trim().max(100).nullable().optional(),
      status: z.enum(somitiStatuses).optional(),
    })
    .strict(),
});

export const somitiIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const somitiListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().optional(),
      status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
      meetingDay: z.enum(["ALL", ...somitiDays]).default("ALL"),
      fieldOfficerId: z.coerce.number().int().positive().optional(),
      sortBy: z
        .enum(["id", "name", "code", "createdAt", "meetingDay"])
        .default("createdAt"),
    })
    .strict(),
});
