import multer from "multer";
import type { RequestHandler } from "express";

import { config } from "../../config/env.js";
import { ValidationError } from "../../errors/AppError.js";
import type { UploadPolicy } from "./upload.validation.js";

const toValidationError = (error: unknown) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return new ValidationError("File exceeds the allowed size");
    if (error.code === "LIMIT_FILE_COUNT") return new ValidationError("Too many files uploaded");
    return new ValidationError("Invalid multipart upload");
  }
  return error;
};

export const createUploadMiddleware = (policy: UploadPolicy, maxFileCount = config.upload.maxFileCount) => {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: policy.maxFileSizeBytes, files: maxFileCount },
    fileFilter: (_req, file, callback) => {
      callback(null, policy.allowedMimeTypes.includes(file.mimetype));
    },
  });
  const wrap = (handler: RequestHandler): RequestHandler => (req, res, next) => {
    handler(req, res, (error: unknown) => next(toValidationError(error)));
  };
  return {
    single: (fieldName: string) => wrap(parser.single(fieldName)),
    array: (fieldName: string, maxCount = maxFileCount): RequestHandler => (req, res, next) => {
      parser.array(fieldName, maxCount)(req, res, (error) => next(toValidationError(error)));
    },
  };
};

export const imageUploadPolicy: UploadPolicy = {
  maxFileSizeBytes: config.upload.maxFileSizeBytes,
  allowedMimeTypes: config.upload.allowedMimeTypes,
};

export const imageUpload = createUploadMiddleware(imageUploadPolicy);
