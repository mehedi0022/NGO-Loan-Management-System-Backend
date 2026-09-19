import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { globalErrorHandler } from "../../src/middlewares/error.middleware.js";
import { validate } from "../../src/middlewares/validate.middleware.js";

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/example",
    validate(
      z.object({
        body: z.object({ count: z.coerce.number().int().positive() }),
      }),
    ),
    (req, res) => res.json(req.body),
  );
  app.use(globalErrorHandler);
  return app;
};

describe("validate middleware", () => {
  it("replaces the body with parsed and transformed data", async () => {
    const response = await request(createApp())
      .post("/example")
      .send({ count: "2" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
  });

  it("forwards validation failures to the error middleware", async () => {
    const response = await request(createApp())
      .post("/example")
      .send({ count: 0 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: [{ field: "body.count" }],
    });
  });
});
