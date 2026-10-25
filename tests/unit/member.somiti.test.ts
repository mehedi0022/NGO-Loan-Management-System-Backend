import { describe, expect, it, vi } from "vitest";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../src/errors/AppError.js";

vi.mock("../../src/modules/member/repositories/member.repository.js", () => ({
  findMemberByNid: vi.fn(),
  findMemberById: vi.fn(),
  createMember: vi.fn(),
  updateMemberId: vi.fn(),
  updateMemberById: vi.fn(),
  findAllMembers: vi.fn(),
}));

vi.mock("../../src/modules/somiti/repositories/somiti.repository.js", () => ({
  findSomitiById: vi.fn(),
  findSomitiByCode: vi.fn(),
}));

vi.mock("../../src/modules/upload/upload.module.js", () => ({
  uploadService: {
    upload: vi.fn(),
    delete: vi.fn(),
  },
}));

import * as memberRepository from "../../src/modules/member/repositories/member.repository.js";
import { findSomitiById } from "../../src/modules/somiti/repositories/somiti.repository.js";
import { createMember, updateMember } from "../../src/modules/member/services/member.service.js";

describe("Member Service - Somiti Integration", () => {
  it("rejects member creation if selected somiti does not exist", async () => {
    vi.mocked(memberRepository.findMemberByNid).mockResolvedValue(null);
    vi.mocked(findSomitiById).mockResolvedValue(null);

    await expect(
      createMember({
        fullName: "Karim Uddin",
        mobileNumber: "01700000000",
        gender: "MALE",
        presentAddress: "Dhaka",
        somitiId: 999,
      } as any),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects member creation if selected somiti is inactive", async () => {
    vi.mocked(memberRepository.findMemberByNid).mockResolvedValue(null);
    vi.mocked(findSomitiById).mockResolvedValue({
      id: 5,
      name: "Padma Somiti",
      status: "INACTIVE",
      fieldOfficerId: 10,
    } as any);

    await expect(
      createMember({
        fullName: "Karim Uddin",
        mobileNumber: "01700000000",
        gender: "MALE",
        presentAddress: "Dhaka",
        somitiId: 5,
      } as any),
    ).rejects.toThrow(ConflictError);
  });

  it("blocks a field officer from registering a member into another officer's somiti", async () => {
    vi.mocked(memberRepository.findMemberByNid).mockResolvedValue(null);
    vi.mocked(findSomitiById).mockResolvedValue({
      id: 5,
      name: "Padma Somiti",
      status: "ACTIVE",
      fieldOfficerId: 20, // Different officer
    } as any);

    await expect(
      createMember(
        {
          fullName: "Karim Uddin",
          mobileNumber: "01700000000",
          gender: "MALE",
          presentAddress: "Dhaka",
          somitiId: 5,
        } as any,
        { userId: 10, role: "FIELD_OFFICER" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("allows a field officer to register a member into their own assigned somiti", async () => {
    vi.mocked(memberRepository.findMemberByNid).mockResolvedValue(null);
    vi.mocked(findSomitiById).mockResolvedValue({
      id: 5,
      name: "Padma Somiti",
      status: "ACTIVE",
      fieldOfficerId: 10, // Matching officer
    } as any);

    vi.mocked(memberRepository.createMember).mockResolvedValue({
      id: 1,
      memberId: "",
      fullName: "Karim Uddin",
      mobileNumber: "01700000000",
      status: "ACTIVE",
      somitiId: 5,
    } as any);

    vi.mocked(memberRepository.updateMemberId).mockResolvedValue({
      id: 1,
      memberId: "AC-00001",
      fullName: "Karim Uddin",
      mobileNumber: "01700000000",
      status: "ACTIVE",
      somitiId: 5,
    } as any);

    const result = await createMember(
      {
        fullName: "Karim Uddin",
        mobileNumber: "01700000000",
        gender: "MALE",
        presentAddress: "Dhaka",
        somitiId: 5,
      } as any,
      { userId: 10, role: "FIELD_OFFICER" },
    );

    expect(result).toBeDefined();
    expect(result.memberId).toBe("AC-00001");
  });
});
