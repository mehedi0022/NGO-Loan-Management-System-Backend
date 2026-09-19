import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import { createLogger } from "../../src/config/logger.js";

describe("structured logger", () => {
  it("redacts credentials and tokens from structured metadata", async () => {
    const destination = new PassThrough();
    let output = "";
    destination.on("data", (chunk) => {
      output += chunk.toString();
    });
    const testLogger = createLogger(destination, "info");

    testLogger.info({
      req: {
        headers: {
          authorization: "Bearer access-secret",
          cookie: "refreshToken=cookie-secret",
        },
        body: {
          password: "password-secret",
          refreshToken: "refresh-secret",
        },
      },
      accessToken: "top-level-access-secret",
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("access-secret");
    expect(output).not.toContain("cookie-secret");
    expect(output).not.toContain("password-secret");
    expect(output).not.toContain("refresh-secret");
  });
});
