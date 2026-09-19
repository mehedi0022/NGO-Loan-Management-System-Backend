import { config } from "../../config/env.js";
import { createCloudinaryStorage } from "./cloudinary.storage.js";
import { createLocalStorage } from "./local.storage.js";
import { imageUploadPolicy } from "./upload.middleware.js";
import { createUploadService } from "./upload.service.js";

export const uploadService = createUploadService(
  config.upload.storage === "cloudinary"
    ? createCloudinaryStorage(config)
    : createLocalStorage(config.upload.localDir),
  imageUploadPolicy,
  config.upload.enabled,
);
