import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../src/modules/somiti/repositories/somiti.repository.js",
  () => ({
    createSomiti: vi.fn(),
    updateSomitiId: vi.fn(),
    findSomitiById: vi.fn(),
    findSomitiByCode: vi.fn(),
    countSomitiMembers: vi.fn(),
    findSomities: vi.fn(),
    findAllActiveSomities: vi.fn(),
    updateSomiti: vi.fn(),
    deleteSomitiById: vi.fn(),
    findSomitiMembers: vi.fn(),
  }),
);

vi.mock(
  "../../src/modules/user/repositories/user.repository.js",
  () => ({
    findUserById: vi.fn(),
  }),
);

import { ConflictError, NotFoundError } from "../../src/errors/AppError.js";
import * as somitiRepository from "../../src/modules/somiti/repositories/somiti.repository.js";
import * as userRepository from "../../src/modules/user/repositories/user.repository.js";
import * as somitiService from "../../src/modules/somiti/services/somiti.service.js";

const createSomitiRepo = vi.mocked(somitiRepository.createSomiti);
const updateSomitiIdRepo = vi.mocked(somitiRepository.updateSomitiId);
const findSomitiByIdRepo = vi.mocked(somitiRepository.findSomitiById);
const findSomitiByCodeRepo = vi.mocked(somitiRepository.findSomitiByCode);
const countSomitiMembersRepo = vi.mocked(somitiRepository.countSomitiMembers);
const findSomitiesRepo = vi.mocked(somitiRepository.findSomities);
const updateSomitiRepo = vi.mocked(somitiRepository.updateSomiti);
const deleteSomitiByIdRepo = vi.mocked(somitiRepository.deleteSomitiById);
const findUserByIdRepo = vi.mocked(userRepository.findUserById);

describe("somiti.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSomiti", () => {
    it("throws ConflictError if somiti code already exists", async () => {
      findSomitiByCodeRepo.mockResolvedValueOnce({ id: 1 } as any);

      await expect(
        somitiService.createSomiti({
          name: "পদ্মা",
          code: "SOM-001",
          meetingDay: "SUNDAY",
          status: "ACTIVE",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError if field officer does not exist", async () => {
      findSomitiByCodeRepo.mockResolvedValueOnce(null);
      findUserByIdRepo.mockResolvedValueOnce(null);

      await expect(
        somitiService.createSomiti({
          name: "পদ্মা",
          fieldOfficerId: 99,
          meetingDay: "SUNDAY",
          status: "ACTIVE",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError if field officer is inactive", async () => {
      findSomitiByCodeRepo.mockResolvedValueOnce(null);
      findUserByIdRepo.mockResolvedValueOnce({ id: 99, isActive: false } as any);

      await expect(
        somitiService.createSomiti({
          name: "পদ্মা",
          fieldOfficerId: 99,
          meetingDay: "SUNDAY",
          status: "ACTIVE",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("creates somiti and auto-generates somitiId", async () => {
      findSomitiByCodeRepo.mockResolvedValueOnce(null);
      createSomitiRepo.mockResolvedValueOnce({
        id: 7,
        name: "পদ্মা",
        code: "SOM-007",
        meetingDay: "SUNDAY",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      updateSomitiIdRepo.mockResolvedValueOnce({
        id: 7,
        somitiId: "SM-00007",
        name: "পদ্মা",
        code: "SOM-007",
        meetingDay: "SUNDAY",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await somitiService.createSomiti({
        name: "পদ্মা",
        code: "SOM-007",
        meetingDay: "SUNDAY",
        status: "ACTIVE",
      });

      expect(updateSomitiIdRepo).toHaveBeenCalledWith(7, "SM-00007");
      expect(result.somitiId).toBe("SM-00007");
      expect(result.name).toBe("পদ্মা");
    });
  });

  describe("getSomities scoping", () => {
    it("automatically scopes to fieldOfficerId when actor is FIELD_OFFICER", async () => {
      findSomitiesRepo.mockResolvedValueOnce({
        somities: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await somitiService.getSomities(
        { page: 1, limit: 20, sortOrder: "desc", sortBy: "createdAt", status: "ALL", meetingDay: "ALL" },
        { userId: 15, role: "FIELD_OFFICER" },
      );

      expect(findSomitiesRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldOfficerId: 15,
        }),
      );
    });

    it("does not force fieldOfficerId for ADMIN actor", async () => {
      findSomitiesRepo.mockResolvedValueOnce({
        somities: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await somitiService.getSomities(
        { page: 1, limit: 20, sortOrder: "desc", sortBy: "createdAt", status: "ALL", meetingDay: "ALL" },
        { userId: 1, role: "ADMIN" },
      );

      const [passedFilters] = findSomitiesRepo.mock.calls[0];
      expect(passedFilters.fieldOfficerId).toBeUndefined();
    });
  });

  describe("deleteSomiti", () => {
    it("throws ConflictError if somiti has registered members", async () => {
      findSomitiByIdRepo.mockResolvedValueOnce({ id: 3, name: "সুরমা" } as any);
      countSomitiMembersRepo.mockResolvedValueOnce(5);

      await expect(somitiService.deleteSomiti(3)).rejects.toThrow(ConflictError);
      expect(deleteSomitiByIdRepo).not.toHaveBeenCalled();
    });

    it("deletes somiti if member count is 0", async () => {
      findSomitiByIdRepo.mockResolvedValueOnce({ id: 3, name: "সুরমা" } as any);
      countSomitiMembersRepo.mockResolvedValueOnce(0);
      deleteSomitiByIdRepo.mockResolvedValueOnce({ id: 3 } as any);

      await somitiService.deleteSomiti(3);
      expect(deleteSomitiByIdRepo).toHaveBeenCalledWith(3);
    });
  });
});
