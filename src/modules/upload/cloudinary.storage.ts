import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

import { StorageProviderError, UploadUnavailableError } from "../../errors/AppError.js";
import type { AppConfig } from "../../config/env.js";
import type { FileStorageProvider, StoredFile, UploadInput } from "./upload.types.js";

const safeFolder = (folder: string) => /^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,119}$/.test(folder);

export const createCloudinaryStorage = (config: AppConfig): FileStorageProvider => ({
  async upload(input: UploadInput): Promise<StoredFile> {
    if (!config.upload.enabled || !config.cloudinary.enabled || !config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      throw new UploadUnavailableError();
    }
    if (!safeFolder(input.folder)) throw new StorageProviderError();
    cloudinary.config({ cloud_name: config.cloudinary.cloudName, api_key: config.cloudinary.apiKey, api_secret: config.cloudinary.apiSecret, secure: true });
    try {
      const result = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: "image",
          folder: `${config.upload.cloudinaryFolder}/${input.folder}`,
          public_id: randomUUID(),
          overwrite: false,
          unique_filename: true,
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        }, (error, value) => error || !value ? reject(error ?? new Error("Cloudinary returned no result")) : resolve(value));
        stream.end(input.buffer);
      });
      return { key: result.public_id, url: result.secure_url, mimeType: input.mimeType, size: input.size };
    } catch {
      throw new StorageProviderError();
    }
  },
  async delete(key: string) {
    if (!config.upload.enabled || !config.cloudinary.enabled || !/^[a-zA-Z0-9_/-]{1,255}$/.test(key)) throw new UploadUnavailableError();
    try {
      const result = await cloudinary.uploader.destroy(key, { resource_type: "image", invalidate: true });
      if (result.result !== "ok" && result.result !== "not found") throw new Error("Cloudinary delete failed");
    } catch {
      throw new StorageProviderError();
    }
  },
});
