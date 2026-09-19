import { AppError, StorageProviderError, UploadUnavailableError } from "../../errors/AppError.js";
import type { FileStorageProvider, StoredFile } from "./upload.types.js";
import { validateUploadedFile, type UploadPolicy } from "./upload.validation.js";

export const createUploadService = (storage: FileStorageProvider, policy: UploadPolicy, enabled: boolean) => ({
  async upload(file: Express.Multer.File, folder: string): Promise<StoredFile> {
    if (!enabled) throw new UploadUnavailableError();
    validateUploadedFile(file, policy);
    try {
      return await storage.upload({ buffer: file.buffer, mimeType: file.mimetype, size: file.size, folder });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new StorageProviderError();
    }
  },
  async replace(
    file: Express.Multer.File,
    folder: string,
    previousKey: string | undefined,
    persist: (stored: StoredFile) => Promise<void>,
  ): Promise<StoredFile> {
    const stored = await this.upload(file, folder);
    try {
      await persist(stored);
    } catch (error) {
      await storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
    if (previousKey) await this.delete(previousKey);
    return stored;
  },
  async delete(key: string) {
    try {
      await storage.delete(key);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new StorageProviderError();
    }
  },
});
