import app from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, environment: config.nodeEnv },
    "Server started",
  );
});

server.on("error", (error) => {
  logger.fatal(
    {
      error: {
        name: error.name,
        code: "code" in error ? String(error.code) : undefined,
      },
    },
    "Server error",
  );
});
