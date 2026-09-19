import { config } from "./env.js";

console.log(JSON.stringify({
  valid: true,
  nodeEnv: config.nodeEnv,
  port: config.port,
  databaseTlsMode: config.database.tls.mode,
  migrationCredentialsSeparated: config.database.migrationUrl !== config.database.runtimeUrl,
  smtpEnabled: config.smtp.enabled,
  cloudinaryEnabled: config.cloudinary.enabled,
  rateLimitStore: config.rateLimit.store,
}));
