import type { SomitiDay, SomitiStatus } from "./somiti.types.js";

export type FieldOfficerSummaryDto = {
  id: number;
  fullName: string | null;
  userName: string | null;
  email: string;
  role: string;
};

export type SomitiDto = {
  id: number;
  somitiId: string | null;
  name: string;
  code: string | null;
  meetingDay: SomitiDay;
  meetingTime: string | null;
  fieldOfficerId: number | null;
  fieldOfficer?: FieldOfficerSummaryDto | null;
  village: string | null;
  union: string | null;
  upazila: string | null;
  district: string | null;
  area: string | null;
  address: string | null;
  status: SomitiStatus;
  memberCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export const toSomitiDto = (
  somiti: any,
  extra?: { memberCount?: number },
): SomitiDto => ({
  id: somiti.id,
  somitiId: somiti.somitiId,
  name: somiti.name,
  code: somiti.code,
  meetingDay: somiti.meetingDay,
  meetingTime: somiti.meetingTime,
  fieldOfficerId: somiti.fieldOfficerId,
  fieldOfficer: somiti.fieldOfficer
    ? {
        id: somiti.fieldOfficer.id,
        fullName: somiti.fieldOfficer.fullName,
        userName: somiti.fieldOfficer.userName,
        email: somiti.fieldOfficer.email,
        role: somiti.fieldOfficer.role,
      }
    : null,
  village: somiti.village,
  union: somiti.union,
  upazila: somiti.upazila,
  district: somiti.district,
  area: somiti.village || null,
  address: somiti.union || [somiti.upazila, somiti.district].filter(Boolean).join(", ") || null,
  status: somiti.status,
  memberCount: extra?.memberCount ?? somiti.memberCount ?? 0,
  createdAt: somiti.createdAt,
  updatedAt: somiti.updatedAt,
});
