import { z } from "zod";

import { paginationQuerySchema } from "../../../utils/pagination.js";

/**
 * Reusable Bangladesh mobile number schema
 */
const mobileNumberSchema = z
  .string("Mobile number is required")
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Please provide a valid Bangladeshi mobile number");

/**
 * Reusable NID schema
 */
const nidNumberSchema = z
  .string()
  .trim()
  .regex(/^(\d{10}|\d{13}|\d{17})$/, "NID number must be 10, 13, or 17 digits");

/**
 * Address
 */
const addressSchema = z.object({
  type: z.enum(["PRESENT", "PERMANENT"]),

  houseOrHolding: z.string().trim().optional(),
  road: z.string().trim().optional(),

  village: z
    .string("Village is required")
    .trim()
    .min(2, "Village must be at least 2 characters"),

  postOffice: z
    .string("Post office is required")
    .trim()
    .min(2, "Post office must be at least 2 characters"),

  union: z.string().trim().optional(),

  upazila: z
    .string("Upazila/Thana is required")
    .trim()
    .min(2, "Upazila/Thana must be at least 2 characters"),

  district: z
    .string("District is required")
    .trim()
    .min(2, "District must be at least 2 characters"),

  division: z.string().trim().optional(),
});

/**
 * Guarantor
 */
const guarantorSchema = z.object({
  fullName: z
    .string("Guarantor name is required")
    .trim()
    .min(3, "Guarantor name must be at least 3 characters"),

  fatherName: z.string().trim().optional(),
  motherName: z.string().trim().optional(),

  mobileNumber: mobileNumberSchema,

  nidNumber: nidNumberSchema.optional(),

  relationship: z
    .string("Relationship is required")
    .trim()
    .min(2, "Relationship must be at least 2 characters"),

  houseOrHolding: z.string().trim().optional(),
  road: z.string().trim().optional(),

  village: z
    .string("Village is required")
    .trim()
    .min(2, "Village must be at least 2 characters"),

  postOffice: z
    .string("Post office is required")
    .trim()
    .min(2, "Post office must be at least 2 characters"),

  union: z.string().trim().optional(),

  upazila: z
    .string("Upazila/Thana is required")
    .trim()
    .min(2, "Upazila/Thana must be at least 2 characters"),

  district: z
    .string("District is required")
    .trim()
    .min(2, "District must be at least 2 characters"),

  division: z.string().trim().optional(),

  occupation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * Create Member
 */
export const createMemberSchema = z.object({
  body: z
    .object({
      fullName: z
        .string("Full name is required")
        .trim()
        .min(3, "Full name must be at least 3 characters"),

      fatherName: z
        .string("Father name is required")
        .trim()
        .min(3, "Father name must be at least 3 characters"),

      motherName: z
        .string("Mother name is required")
        .trim()
        .min(3, "Mother name must be at least 3 characters"),

      guardianName: z.string().trim().optional(),

      mobileNumber: mobileNumberSchema,

      nidNumber: nidNumberSchema.optional(),

      email: z.email("Invalid email address").optional(),

      photoUrl: z.url("Invalid photo URL").optional(),

      occupation: z.string().trim().optional(),

      joinDate: z.coerce.date().optional(),

      notes: z.string().trim().optional(),

      addresses: z
        .array(addressSchema)
        .min(1, "At least one address is required")
        .max(2, "Maximum two addresses are allowed"),

      guarantors: z.array(guarantorSchema).optional(),
    })
    .strict(),
});

/**
 * Member ID params
 */
const memberIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const memberIdSchema = z.object({
  params: memberIdParams,
});

/**
 * Update Member
 */
export const updateMemberSchema = z.object({
  params: memberIdParams,

  body: z
    .object({
      fullName: z.string().trim().min(3).optional(),

      fatherName: z.string().trim().min(3).optional(),

      motherName: z.string().trim().min(3).optional(),

      guardianName: z.string().trim().nullable().optional(),

      mobileNumber: mobileNumberSchema.optional(),

      nidNumber: nidNumberSchema.nullable().optional(),

      email: z.email("Invalid email address").nullable().optional(),

      photoUrl: z.url("Invalid photo URL").nullable().optional(),

      occupation: z.string().trim().nullable().optional(),

      joinDate: z.coerce.date().optional(),

      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),

      notes: z.string().trim().nullable().optional(),

      addresses: z.array(addressSchema).max(2).optional(),

      guarantors: z.array(guarantorSchema).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one member field is required",
    }),
});

/**
 * Member List Query
 */
export const memberListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),

      search: z.string().trim().optional(),

      district: z.string().trim().optional(),

      sortBy: z
        .enum(["id", "memberId", "fullName", "joinDate", "createdAt"])
        .default("createdAt"),
    })
    .strict(),
});
