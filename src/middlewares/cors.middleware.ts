import cors from "cors";

import { config } from "../config/env.js";
import { AuthorizationError } from "../errors/AppError.js";

const allowedOrigins = new Set(config.cors.origins);

export const corsMiddleware = cors({
  credentials: config.cors.credentials,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new AuthorizationError("Origin is not allowed"));
  },
  optionsSuccessStatus: 204,
});
