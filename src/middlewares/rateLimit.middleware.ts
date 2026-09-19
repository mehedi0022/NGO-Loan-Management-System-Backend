import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import {
  ipKeyGenerator,
  MemoryStore,
  rateLimit,
  type Store,
} from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

import { config } from "../config/env.js";
import { getRateLimitRedisClient } from "../config/redis.js";
import { AppError } from "../errors/AppError.js";

type RateLimiterOptions = {
  name: string;
  max: number;
  windowMs: number;
  store?: Store;
  key?: (req: Request) => string;
};

const redisClient = await getRateLimitRedisClient();
const memoryStores: MemoryStore[] = [];

const clientKey = (req: Request) =>
  req.ip ? ipKeyGenerator(req.ip, 56) : req.socket.remoteAddress ?? "unknown";

const createPolicyStore = (name: string): Store => {
  if (redisClient) {
    return new RedisStore({
      prefix: `${config.rateLimit.redisPrefix}${name}:`,
      sendCommand: (...args: string[]) =>
        redisClient.sendCommand(args) as Promise<RedisReply>,
    });
  }
  const store = new MemoryStore();
  memoryStores.push(store);
  return store;
};

export const resetDefaultRateLimitStore = async () => {
  await Promise.all(memoryStores.map((store) => store.resetAll()));
};

export const createRateLimiter = ({
  name,
  max,
  windowMs,
  store = createPolicyStore(name),
  key = clientKey,
}: RateLimiterOptions): RequestHandler => {
  if (!config.rateLimit.enabled) return (_req, _res, next) => next();

  return rateLimit({
    windowMs,
    limit: max,
    identifier: name,
    store,
    keyGenerator: key,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    handler: (_req, _res, next) =>
      next(new AppError("Too many requests", 429, true, "RATE_LIMITED")),
  });
};

const emailKey = (req: Request) =>
  `${clientKey(req)}:${typeof req.body?.email === "string"
    ? createHash("sha256").update(req.body.email.trim().toLowerCase()).digest("hex")
    : "unknown"}`;

export const globalApiRateLimit = createRateLimiter({ name: "global", ...config.rateLimit.global });
export const loginRateLimit = createRateLimiter({ name: "login", ...config.rateLimit.login, key: emailKey });
export const registerRateLimit = createRateLimiter({ name: "register", ...config.rateLimit.register });
export const refreshRateLimit = createRateLimiter({ name: "refresh", ...config.rateLimit.refresh });
export const forgotPasswordRateLimit = createRateLimiter({ name: "forgot-password", ...config.rateLimit.forgotPassword, key: emailKey });
