import path from "node:path";

import { ValidationError } from "../../errors/AppError.js";

export type UploadPolicy = {
  maxFileSizeBytes: number;
  allowedMimeTypes: readonly string[];
};

const signatures: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

const extensions: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export const validateUploadedFile = (
  file: Pick<Express.Multer.File, "buffer" | "mimetype" | "originalname" | "size">,
  policy: UploadPolicy,
) => {
  if (file.size <= 0 || file.size > policy.maxFileSizeBytes) {
    throw new ValidationError("File exceeds the allowed size");
  }
  if (!policy.allowedMimeTypes.includes(file.mimetype) || !signatures[file.mimetype]) {
    throw new ValidationError("Unsupported file type");
  }
  const extension = path.extname(file.originalname).toLowerCase();
  if (!extensions[file.mimetype].includes(extension)) {
    throw new ValidationError("File extension does not match its type");
  }
  if (!signatures[file.mimetype](file.buffer)) {
    throw new ValidationError("File content does not match its declared type");
  }
};
