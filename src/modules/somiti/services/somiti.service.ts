import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import { findUserById } from "../../user/repositories/user.repository.js";
import { toSomitiDto } from "../somiti.dto.js";
import type {
  CreateSomitiInput,
  SomitiListQuery,
  UpdateSomitiInput,
} from "../somiti.types.js";
import * as repository from "../repositories/somiti.repository.js";

type Actor = {
  userId: number;
  role: string;
};

export const createSomiti = async (data: CreateSomitiInput) => {
  if (data.code) {
    const existing = await repository.findSomitiByCode(data.code);
    if (existing) {
      throw new ConflictError("A somiti with this code already exists");
    }
  }

  if (data.fieldOfficerId) {
    const officer = await findUserById(data.fieldOfficerId);
    if (!officer) {
      throw new NotFoundError("Field officer not found");
    }
    if (!officer.isActive) {
      throw new ConflictError("Selected field officer is currently inactive");
    }
  }

  const somiti = await repository.createSomiti(data);

  // Auto-generate somitiId (e.g. SM-00001)
  const somitiId = `SM-${String(somiti.id).padStart(5, "0")}`;
  const updatedSomiti = await repository.updateSomitiId(somiti.id, somitiId);

  return toSomitiDto(updatedSomiti || somiti);
};

export const getSomities = async (query: SomitiListQuery, actor: Actor) => {
  const filters: SomitiListQuery = { ...query };

  // If actor is FIELD_OFFICER, automatically restrict to their assigned somities
  if (actor.role === "FIELD_OFFICER") {
    filters.fieldOfficerId = actor.userId;
  }

  const { somities, meta } = await repository.findSomities(filters);

  return {
    somities: somities.map((s) => toSomitiDto(s)),
    meta,
  };
};

export const getActiveSomitiesList = async (actor: Actor) => {
  const officerId =
    actor.role === "FIELD_OFFICER" ? actor.userId : undefined;
  return repository.findAllActiveSomities(officerId);
};

export const getSomitiById = async (id: number, actor?: Actor) => {
  const somiti = await repository.findSomitiById(id);
  if (!somiti) {
    throw new NotFoundError("Somiti not found");
  }

  const memberCount = await repository.countSomitiMembers(id);

  return toSomitiDto(somiti, { memberCount });
};

export const updateSomiti = async (id: number, data: UpdateSomitiInput) => {
  const existing = await repository.findSomitiById(id);
  if (!existing) {
    throw new NotFoundError("Somiti not found");
  }

  if (data.code && data.code !== existing.code) {
    const codeConflict = await repository.findSomitiByCode(data.code);
    if (codeConflict && codeConflict.id !== id) {
      throw new ConflictError("A somiti with this code already exists");
    }
  }

  if (data.fieldOfficerId && data.fieldOfficerId !== existing.fieldOfficerId) {
    const officer = await findUserById(data.fieldOfficerId);
    if (!officer) {
      throw new NotFoundError("Field officer not found");
    }
    if (!officer.isActive) {
      throw new ConflictError("Selected field officer is currently inactive");
    }
  }

  const updated = await repository.updateSomiti(id, data);
  if (!updated) {
    throw new NotFoundError("Somiti not found");
  }

  const memberCount = await repository.countSomitiMembers(id);
  return toSomitiDto(updated, { memberCount });
};

export const deleteSomiti = async (id: number) => {
  const existing = await repository.findSomitiById(id);
  if (!existing) {
    throw new NotFoundError("Somiti not found");
  }

  const memberCount = await repository.countSomitiMembers(id);
  if (memberCount > 0) {
    throw new ConflictError(
      `Cannot delete somiti "${existing.name}" because it has ${memberCount} registered member(s). Please reassign members or set status to INACTIVE instead.`,
    );
  }

  await repository.deleteSomitiById(id);
};

export const getSomitiMembers = async (
  somitiId: number,
  page = 1,
  limit = 20,
) => {
  const existing = await repository.findSomitiById(somitiId);
  if (!existing) {
    throw new NotFoundError("Somiti not found");
  }

  return repository.findSomitiMembers(somitiId, page, limit);
};
