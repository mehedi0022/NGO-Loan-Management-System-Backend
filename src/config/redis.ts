import { createClient } from "redis";

import { config } from "./env.js";
import { logger } from "./logger.js";

const createRateLimitClient = () => createClient({
  url: config.redis.url,
  socket: { connectTimeout: config.redis.connectTimeoutMs },
});

let rateLimitClient: ReturnType<typeof createRateLimitClient> | undefined;

export const getRateLimitRedisClient = async () => {
  if (config.rateLimit.store !== "redis" || !config.redis.url) return undefined;
  if (rateLimitClient) return rateLimitClient;

  const client = createRateLimitClient();
  client.on("error", (error) => {
    logger.error(
      { error: { name: error.name, message: error.message } },
      "Rate-limit Redis client error",
    );
  });
  await client.connect();
  rateLimitClient = client;
  return client;
};

export const closeRateLimitRedisClient = async () => {
  if (!rateLimitClient) return;
  const client = rateLimitClient;
  rateLimitClient = undefined;
  if (client.isOpen) await client.close();
};
