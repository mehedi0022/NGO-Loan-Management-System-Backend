import express from "express";
import { MemoryStore } from "express-rate-limit";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app.js";
import {
  createRateLimiter,
  forgotPasswordRateLimit,
  resetDefaultRateLimitStore,
} from "../../src/middlewares/rateLimit.middleware.js";

const allowedOrigin = "http://localhost:3000";

beforeEach(async () => resetDefaultRateLimitStore());

describe("CORS and CSRF boundary", () => {
  it("returns credentialed CORS headers only for an allowed origin", async () => {
    const response = await request(app)
      .options("/api/v1/auth/refresh")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects a disallowed origin without reflecting it", async () => {
    const response = await request(app)
      .get("/api/v1/missing")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("requires a trusted source for cookie-authenticated mutations", async () => {
    const missing = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "refreshToken=attacker-controlled");
    expect(missing.status).toBe(403);

    const allowed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Referer", `${allowedOrigin}/account`)
      .set("Cookie", "refreshToken=invalid");
    expect(allowed.status).toBe(401);
  });
});

describe("rate limiting", () => {
  it("enforces the configured global API policy", async () => {
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      expect((await request(app).get("/api/v1/missing")).status).toBe(404);
    }
    expect((await request(app).get("/api/v1/missing")).status).toBe(429);
  });

  it("enforces a reusable limiter and emits retry metadata", async () => {
    const limitedApp = express();
    limitedApp.use(createRateLimiter({
      name: "test",
      max: 2,
      windowMs: 60_000,
      store: new MemoryStore(),
    }));
    limitedApp.get("/", (_req, res) => res.sendStatus(204));

    expect((await request(limitedApp).get("/")).status).toBe(204);
    expect((await request(limitedApp).get("/")).status).toBe(204);
    const blocked = await request(limitedApp).get("/");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.headers.ratelimit).toContain("r=0");
  });

  it("uses a stricter login policy than the global API policy", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "limited@example.com",
        password: "",
      });
      expect(response.status).toBe(400);
    }
    const blocked = await request(app).post("/api/v1/auth/login").send({
      email: "limited@example.com",
      password: "",
    });
    expect(blocked.status).toBe(429);
  });

  it("applies independent registration and refresh limits", async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await request(app).post("/api/v1/auth/register").send({})).status)
        .toBe(400);
    }
    expect((await request(app).post("/api/v1/auth/register").send({})).status)
      .toBe(429);

    for (let attempt = 1; attempt <= 30; attempt += 1) {
      expect((await request(app).post("/api/v1/auth/refresh")).status).toBe(401);
    }
    expect((await request(app).post("/api/v1/auth/refresh")).status).toBe(429);
  });

  it("provides a separate policy for a future forgot-password endpoint", async () => {
    const authApp = express();
    authApp.use(express.json());
    authApp.post("/forgot-password", forgotPasswordRateLimit, (_req, res) =>
      res.sendStatus(204));
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await request(authApp).post("/forgot-password").send({
        email: "account@example.com",
      })).status).toBe(204);
    }
    expect((await request(authApp).post("/forgot-password").send({
      email: "account@example.com",
    })).status).toBe(429);
  });
});

describe("proxy assumptions", () => {
  it("ignores spoofed forwarding headers when trust proxy is disabled", async () => {
    const proxyApp = express();
    proxyApp.set("trust proxy", false);
    proxyApp.get("/", (req, res) => res.json({ ip: req.ip }));
    const response = await request(proxyApp)
      .get("/")
      .set("X-Forwarded-For", "203.0.113.10");
    expect(response.body.ip).not.toBe("203.0.113.10");
  });

  it("uses forwarding headers only with an explicit proxy hop", async () => {
    const proxyApp = express();
    proxyApp.set("trust proxy", 1);
    proxyApp.get("/", (req, res) => res.json({ ip: req.ip }));
    const response = await request(proxyApp)
      .get("/")
      .set("X-Forwarded-For", "203.0.113.10");
    expect(response.body.ip).toBe("203.0.113.10");
  });
});
