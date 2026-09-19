import type { AuthenticatedUser } from "../middlewares/auth.middleware.js";
import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
      id: string;
      log: Logger;
    }
  }
}

export {};
