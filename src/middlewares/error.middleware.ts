import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import type { Logger } from "pino";
import { ZodError } from "zod";

import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  AppError,
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../errors/AppError.js";
import { errorResponse } from "../utils/api-response.js";

type ErrorLike = Error & {
  body?: unknown;
  code?: string;
  status?: number;
  type?: string;
};

type ErrorHandlerOptions = {
  nodeEnv?: typeof config.nodeEnv;
  fallbackLogger?: Logger;
};

const sensitiveValuePatterns = [
  /Bearer\s+\S+/gi,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\b(password|passwordHash|accessToken|refreshToken|secret|authorization|cookie)\b\s*[:=]\s*[^\s,;]+/gi,
];

const redactText = (value: string) =>
  sensitiveValuePatterns.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  );

const isMalformedJsonError = (error: ErrorLike) =>
  error instanceof SyntaxError &&
  error.status === 400 &&
  error.type === "entity.parse.failed" &&
  "body" in error;

const findDatabaseCode = (error: unknown, depth = 0): string | undefined => {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    cause?: unknown;
    code?: unknown;
    meta?: { sqlState?: unknown };
    sqlState?: unknown;
  };
  const code = candidate.sqlState ?? candidate.meta?.sqlState ?? candidate.code;

  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
    return code;
  }

  return findDatabaseCode(candidate.cause, depth + 1);
};

const classifyError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError("Validation failed", error.issues);
  }

  if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
    return new AuthenticationError("Invalid or expired token");
  }

  if (error instanceof Error && isMalformedJsonError(error as ErrorLike)) {
    return new ValidationError("Malformed JSON body");
  }

  const databaseCode = findDatabaseCode(error);

  if (databaseCode === "23505") {
    return new ConflictError("Resource already exists");
  }

  if (databaseCode === "23503") {
    return new ConflictError("Related resource conflict");
  }

  if (databaseCode === "22P02") {
    return new ValidationError("Invalid data format");
  }

  return new AppError(
    "Internal server error",
    500,
    false,
    "INTERNAL_SERVER_ERROR",
  );
};

const logError = (
  requestLogger: Logger,
  originalError: unknown,
  publicError: AppError,
  nodeEnv: typeof config.nodeEnv,
  request: { method: string; path: string },
) => {
  const original = originalError instanceof Error ? originalError : undefined;

  requestLogger.error(
    {
      error: {
        name: original?.name ?? typeof originalError,
        code:
          typeof originalError === "object" &&
          originalError !== null &&
          "code" in originalError
            ? String(originalError.code)
            : publicError.code,
        isOperational: publicError.isOperational,
        ...(publicError.isOperational && { message: redactText(publicError.message) }),
        ...(nodeEnv === "development" && original?.stack
          ? { stack: redactText(original.stack) }
          : {}),
      },
      method: request.method,
      path: request.path,
      status: publicError.statusCode,
    },
    "Request failed",
  );
};

export const createErrorHandler = ({
  nodeEnv = config.nodeEnv,
  fallbackLogger = logger,
}: ErrorHandlerOptions = {}): ErrorRequestHandler =>
  (error: unknown, req, res, next) => {
    const requestLogger = req.log ?? fallbackLogger;

    if (res.headersSent) {
      logError(
        requestLogger,
        error,
        classifyError(error),
        nodeEnv,
        { method: req.method, path: req.path },
      );
      return next(error);
    }

    const publicError = classifyError(error);
    logError(requestLogger, error, publicError, nodeEnv, {
      method: req.method,
      path: req.path,
    });

    const responseMessage = redactText(publicError.message);

    res.status(publicError.statusCode).json(errorResponse(responseMessage, publicError.code, {
      ...(req.id && { requestId: req.id }),
      ...(publicError instanceof ValidationError &&
        publicError.details !== undefined && {
        details: publicError.details,
      }),
      ...(nodeEnv === "development" &&
        !publicError.isOperational && {
          debug: {
            name: error instanceof Error ? error.name : typeof error,
            message: redactText(
              error instanceof Error ? error.message : String(error),
            ),
          },
        }),
    }));
  };

export const globalErrorHandler = createErrorHandler();
