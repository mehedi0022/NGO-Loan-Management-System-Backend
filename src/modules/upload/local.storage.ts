import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { StorageProviderError } from "../../errors/AppError.js";
import type { FileStorageProvider, StoredFile, UploadInput } from "./upload.types.js";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const createLocalStorage = (rootDirectory: string, publicBasePath = "/uploads"): FileStorageProvider => {
  const root = path.resolve(rootDirectory);
  const resolveKey = (key: string) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,255}$/.test(key)) throw new StorageProviderError();
    const resolved = path.resolve(root, key);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new StorageProviderError();
    return resolved;
  };
  return {
    async upload(input: UploadInput): Promise<StoredFile> {
      const extension = extensions[input.mimeType];
      if (!extension || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(input.folder)) throw new StorageProviderError();
      const key = `${input.folder}/${randomUUID()}${extension}`;
      try {
        const destination = resolveKey(key);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, input.buffer, { flag: "wx" });
        return {
          key,
          url: `${publicBasePath.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`,
          mimeType: input.mimeType,
          size: input.size,
        };
      } catch (error) {
        if (error instanceof StorageProviderError) throw error;
        throw new StorageProviderError();
      }
    },
    async delete(key: string) {
      try {
        await rm(resolveKey(key), { force: true });
      } catch (error) {
        if (error instanceof StorageProviderError) throw error;
        throw new StorageProviderError();
      }
    },
  };
};
