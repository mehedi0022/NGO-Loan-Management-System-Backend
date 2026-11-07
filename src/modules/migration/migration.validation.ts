import { z } from "zod";

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Please provide a valid Bangladeshi mobile number");

const addressSchema = z.object({
  type: z.enum(["PRESENT", "FATHER_HOME"]).default("PRESENT"),
  houseOrHolding: z.string().trim().optional(),
  road: z.string().trim().optional(),
  village: z.string().trim().min(1, "Village is required"),
  postOffice: z.string().trim().min(1, "Post office is required"),
  union: z.string().trim().optional(),
  upazila: z.string().trim().min(1, "Upazila/Thana is required"),
  district: z.string().trim().min(1, "District is required"),
  division: z.string().trim().optional(),
});

const guarantorSchema = z.object({
  fullName: z.string().trim().min(2, "Guarantor name is required"),
  fatherName: z.string().trim().optional(),
  motherName: z.string().trim().optional(),
  mobileNumber: mobileNumberSchema,
  nidNumber: z.string().trim().optional(),
  relationship: z.string().trim().min(2, "Relationship is required"),
  houseOrHolding: z.string().trim().optional(),
  road: z.string().trim().optional(),
  village: z.string().trim().optional(),
  postOffice: z.string().trim().optional(),
  union: z.string().trim().optional(),
  upazila: z.string().trim().optional(),
  district: z.string().trim().optional(),
  division: z.string().trim().optional(),
  occupation: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const savingsSchema = z.object({
  generalSavingsBalance: z.coerce.number().min(0, "General savings must be 0 or more").default(0),
  specialSavingsBalance: z.coerce.number().min(0, "Special savings must be 0 or more").default(0),
  openedAt: z.coerce.date().optional(),
});

const loanSchema = z.object({
  loanId: z.string().trim().optional(),
  principalAmount: z.coerce.number().positive("Principal amount must be greater than 0"),
  chargeType: z.enum(["FLAT", "PERCENTAGE"]).default("PERCENTAGE"),
  chargeValue: z.coerce.number().min(0, "Charge value cannot be negative"),
  installmentCount: z.coerce.number().int().min(1, "Installment count must be at least 1"),
  installmentAmount: z.coerce.number().positive("Installment amount must be positive").optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY"]).default("WEEKLY"),
  disbursementDate: z.coerce.date(),
  firstDueDate: z.coerce.date(),
  paidInstallments: z.coerce.number().int().min(0, "Paid installments cannot be negative").default(0),
  purpose: z.string().trim().optional(),
  notes: z.string().trim().optional(),
}).refine(
  (data) => data.paidInstallments <= data.installmentCount,
  {
    message: "Paid installments cannot exceed total installment count",
    path: ["paidInstallments"],
  }
);

const dpsSchema = z.object({
  dpsNumber: z.string().trim().optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY"]).default("MONTHLY"),
  installmentAmount: z.coerce.number().positive("Installment amount must be positive"),
  durationMonths: z.coerce.number().int().positive("Duration in months must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative"),
  startDate: z.coerce.date(),
  paidInstallments: z.coerce.number().int().min(0, "Paid installments cannot be negative").default(0),
  notes: z.string().trim().optional(),
});

export const singleMemberMigrationSchema = z.object({
  body: z.object({
    memberId: z.string().trim().optional(),
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    fatherName: z.string().trim().min(2, "Father's name is required"),
    motherName: z.string().trim().min(2, "Mother's name is required"),
    guardianName: z.string().trim().optional(),
    mobileNumber: mobileNumberSchema,
    nidNumber: z.string().trim().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    occupation: z.string().trim().optional(),
    joinDate: z.coerce.date().optional(),
    somitiId: z.coerce.number().int().positive("Somiti ID must be positive").optional(),
    admissionFee: z.coerce.number().min(0).default(0),
    notes: z.string().trim().optional(),

    addresses: z.array(addressSchema).optional(),
    guarantors: z.array(guarantorSchema).optional(),

    savings: savingsSchema.optional(),
    loan: loanSchema.optional(),
    dps: dpsSchema.optional(),
  }),
});

export const batchMemberMigrationSchema = z.object({
  body: z.object({
    members: z.array(singleMemberMigrationSchema.shape.body).min(1, "At least one member is required for migration"),
  }),
});
