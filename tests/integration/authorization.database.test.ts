import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "../helpers/test-database.js";

const databaseTestsEnabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!databaseTestsEnabled)("database-backed authorization", () => {
  let app: Awaited<typeof import("../../src/app.js")>["default"];
  let dbModule: typeof import("../../src/prisma/db.js");
  let jwtUtils: typeof import("../../src/utils/jwt.util.js");
  let userId: number;

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "disable";
    [{ default: app }, dbModule, jwtUtils] = await Promise.all([
      import("../../src/app.js"),
      import("../../src/prisma/db.js"),
      import("../../src/utils/jwt.util.js"),
    ]);

    const user = await dbModule.db.orm.public.User.create({
      email: `${randomUUID()}@authorization.test`,
      password: "not-used-by-this-test",
    });
    userId = user.id;
    expect(user.role).toBe("USER");
  });

  afterAll(async () => {
    if (userId) await dbModule.db.orm.public.User.where({ id: userId }).delete();
    await dbModule.closeDatabase();
  });

  it("uses the current database role instead of a role stored in the token", async () => {
    const accessToken = jwtUtils.signAccessToken({ userId });

    const denied = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(denied.status).toBe(403);

    await dbModule.db.orm.public.User.where({ id: userId }).update({ role: "ADMIN" });

    const allowed = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: userId, role: "ADMIN" }),
    ]));
  });
});
