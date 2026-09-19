import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../src/errors/AppError.js";
import { createErrorHandler } from "../../src/middlewares/error.middleware.js";

const createApp = (
  error: unknown,
  nodeEnv: "development" | "test" | "production" = "production",
) => {
  const app = express();
  app.get("/error", (_req, _res, next) => next(error));
  app.use(createErrorHandler({ nodeEnv }));
  return app;
};

describe("global error middleware", () => {
  it("preserves known operational errors", async () => {
    const response = await request(
      createApp(new AppError("Resource unavailable", 409, true, "CONFLICT")),
    ).get("/error");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: "Resource unavailable",
      code: "CONFLICT",
    });
  });

  it("returns a generic production response for unexpected errors", async () => {
    const response = await request(
      createApp(new Error("database password=super-secret at C:\\private\\file.ts")),
    ).get("/error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(JSON.stringify(response.body)).not.toContain("super-secret");
    expect(JSON.stringify(response.body)).not.toContain("private");
  });

  it("provides redacted development diagnostics", async () => {
    const response = await request(
      createApp(
        new Error("failed with refreshToken=secret-value"),
        "development",
      ),
    ).get("/error");

    expect(response.status).toBe(500);
    expect(response.body.debug.name).toBe("Error");
    expect(response.body.debug.message).toContain("[REDACTED]");
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
  });

  it("maps PostgreSQL unique conflicts without exposing database details", async () => {
    const databaseError = Object.assign(new Error("Prisma execution failed"), {
      code: "RUNTIME.EXECUTE_FAILED",
      cause: Object.assign(new Error("duplicate key users_email_key"), {
        code: "23505",
        detail: "email=user@example.com",
      }),
    });
    const response = await request(createApp(databaseError)).get("/error");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: "Resource already exists",
      code: "CONFLICT",
    });
    expect(JSON.stringify(response.body)).not.toContain("users_email_key");
  });

  it("delegates to Express when response headers were already sent", () => {
    const error = new Error("stream failed");
    const next = vi.fn();
    const fallbackLogger = { error: vi.fn() };
    const handler = createErrorHandler({
      nodeEnv: "production",
      fallbackLogger: fallbackLogger as never,
    });

    handler(
      error,
      { log: undefined } as never,
      { headersSent: true } as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(fallbackLogger.error).toHaveBeenCalledOnce();
  });
});
