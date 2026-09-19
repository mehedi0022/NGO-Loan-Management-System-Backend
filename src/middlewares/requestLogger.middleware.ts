import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "pino";

import { logger } from "../config/logger.js";

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export const createRequestLogger = (baseLogger: Logger = logger): RequestHandler =>
  (req, res, next) => {
    const incomingId = req.get("x-request-id");
    const requestId =
      incomingId && validRequestId.test(incomingId) ? incomingId : randomUUID();
    const startedAt = process.hrtime.bigint();

    req.id = requestId;
    req.log = baseLogger.child({ requestId });
    res.setHeader("x-request-id", requestId);

    res.once("finish", () => {
      const responseTimeMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      req.log.info(
        {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          responseTimeMs: Math.round(responseTimeMs * 100) / 100,
        },
        "Request completed",
      );
    });

    next();
  };
