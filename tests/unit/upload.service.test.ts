import { describe, expect, it, vi } from "vitest";

import { StorageProviderError, UploadUnavailableError, ValidationError } from "../../src/errors/AppError.js";
import { createUploadService } from "../../src/modules/upload/upload.service.js";
import { validateUploadedFile } from "../../src/modules/upload/upload.validation.js";
import type { FileStorageProvider } from "../../src/modules/upload/upload.types.js";

const policy = { maxFileSizeBytes: 1_024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] };
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const file = (overrides: Partial<Express.Multer.File> = {}) => ({
  buffer: jpeg,
  mimetype: "image/jpeg",
  originalname: "avatar.jpg",
  size: jpeg.length,
  ...overrides,
}) as Express.Multer.File;

const storage = (): FileStorageProvider => ({
  upload: vi.fn().mockResolvedValue({ key: "express-starter/avatar/id", url: "https://cdn.example.test/image.jpg", mimeType: "image/jpeg", size: jpeg.length }),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe("secure upload infrastructure", () => {
  it("accepts a valid image and delegates only validated data to storage", async () => {
    const provider = storage();
    const service = createUploadService(provider, policy, true);
    await expect(service.upload(file(), "avatars")).resolves.toMatchObject({ key: "express-starter/avatar/id" });
    expect(provider.upload).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg", folder: "avatars" }));
  });

  it("rejects an invalid MIME type, extension, and spoofed image signature", () => {
    expect(() => validateUploadedFile(file({ mimetype: "text/plain", originalname: "avatar.txt" }), policy)).toThrow(ValidationError);
    expect(() => validateUploadedFile(file({ originalname: "avatar.png" }), policy)).toThrow("extension");
    expect(() => validateUploadedFile(file({ buffer: Buffer.from("not an image") }), policy)).toThrow("content");
  });

  it("rejects oversized files before they are passed to storage", async () => {
    const provider = storage();
    const service = createUploadService(provider, policy, true);
    await expect(service.upload(file({ size: 1_025 }), "avatars")).rejects.toThrow("exceeds");
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("normalizes provider failures without leaking provider implementation details", async () => {
    const provider = storage();
    vi.mocked(provider.upload).mockRejectedValue(new Error("provider secret failure"));
    const service = createUploadService(provider, policy, true);
    await expect(service.upload(file(), "avatars")).rejects.toBeInstanceOf(StorageProviderError);
  });

  it("deletes files and cleans a newly uploaded replacement if persistence fails", async () => {
    const provider = storage();
    const service = createUploadService(provider, policy, true);
    await expect(service.delete("old-key")).resolves.toBeUndefined();
    vi.mocked(provider.delete).mockClear();
    await expect(service.replace(file(), "avatars", "old-key", async () => { throw new Error("database failed"); }))
      .rejects.toThrow("database failed");
    expect(provider.delete).toHaveBeenCalledWith("express-starter/avatar/id");
    expect(provider.delete).not.toHaveBeenCalledWith("old-key");
  });

  it("does not allow upload when the optional module is disabled", async () => {
    const service = createUploadService(storage(), policy, false);
    await expect(service.upload(file(), "avatars")).rejects.toBeInstanceOf(UploadUnavailableError);
  });
});
