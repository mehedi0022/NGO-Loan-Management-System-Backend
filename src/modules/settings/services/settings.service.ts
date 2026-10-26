import type { OrganizationSettingsDTO } from "../settings.types.js";
import * as repository from "../repositories/settings.repository.js";

export const getSettings = async () => {
  return await repository.getSettings();
};

export const updateSettings = async (data: OrganizationSettingsDTO) => {
  return await repository.updateSettings(data);
};
