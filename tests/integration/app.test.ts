import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

describe("application boot", () => {
  it("boots and serves the common middleware/error pipeline", async () => {
    const response = await request(app)
      .get("/api/v1/not-a-route")
      .set("x-request-id", "test-request-id");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false });
    expect(response.headers["x-request-id"]).toBe("test-request-id");
    expect(response.body.requestId).toBe("test-request-id");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("handles malformed JSON as a safe client error", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("content-type", "application/json")
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "Malformed JSON body",
      code: "VALIDATION_ERROR",
    });
  });
});
