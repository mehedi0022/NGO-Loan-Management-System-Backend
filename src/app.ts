import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "temporal-polyfill/full/global";
import { config } from "./config/env.js";

import routes from "./routes/index.js";
import { notFoundHandler } from "./middlewares/notFound.middleware.js";
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import { createRequestLogger } from "./middlewares/requestLogger.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { globalApiRateLimit } from "./middlewares/rateLimit.middleware.js";

const app = express();

app.set("trust proxy", config.trustProxy);

app.use(createRequestLogger());
app.use(helmet());
app.use(corsMiddleware);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(cookieParser());

if (config.upload.enabled && config.upload.storage === "local") {
  app.use("/uploads", express.static(config.upload.localDir, { fallthrough: true, index: false }));
}

app.use("/api/v1", globalApiRateLimit, routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
