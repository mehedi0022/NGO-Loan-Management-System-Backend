import pino, { type DestinationStream, type LoggerOptions } from "pino";

import { config } from "./env.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.passwordHash",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.body.secret",
  "smtp.user",
  "smtp.password",
  "smtp.auth.user",
  "smtp.auth.pass",
  "headers.authorization",
  "headers.cookie",
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "secret",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "*.password",
  "*.passwordHash",
  "*.accessToken",
  "*.refreshToken",
  "*.secret",
];

export const createLogger = (
  destination?: DestinationStream,
  level = config.logLevel,
) => {
  const options: LoggerOptions = {
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]",
    },
  };

  return destination ? pino(options, destination) : pino(options);
};

export const logger = createLogger();
