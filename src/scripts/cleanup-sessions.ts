import { logger } from "../config/logger.js";
import { cleanupSessions } from "../modules/session/services/session.service.js";
import { closeDatabase } from "../prisma/db.js";

try {
  const deletedCount = await cleanupSessions();
  logger.info({ deletedCount }, "Session cleanup completed");
} catch (error) {
  logger.error({ error }, "Session cleanup failed");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
