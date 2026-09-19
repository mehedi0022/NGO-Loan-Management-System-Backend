import { randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "../helpers/test-database.js";

const databaseTestsEnabled = process.env.RUN_DATABASE_TESTS === "true";

describe.skipIf(!databaseTestsEnabled)("refresh-session atomic rotation", () => {
  let dbModule: typeof import("../../src/prisma/db.js");
  let repository: typeof import(
    "../../src/modules/session/repositories/session.repository.js"
  );
  const userIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "disable";
    dbModule = await import("../../src/prisma/db.js");
    repository = await import(
      "../../src/modules/session/repositories/session.repository.js"
    );
  });

  afterAll(async () => {
    for (const userId of userIds) {
      while (await dbModule.db.orm.public.Session.where({ userId }).delete()) {
        // Prisma Next mutations return one row; drain each session in the family.
      }
      await dbModule.db.orm.public.User.where({ id: userId }).delete();
    }
    await dbModule.closeDatabase();
  });

  const createUser = async () => {
    const user = await dbModule.db.orm.public.User.create({
      email: `${randomUUID()}@refresh.test`,
      password: "not-a-real-password-hash",
    });
    userIds.push(user.id);
    return user;
  };

  const createSession = async (options?: {
    revoked?: boolean;
    expired?: boolean;
    jti?: string;
    familyId?: string;
  }) => {
    const user = await createUser();
    const now = Temporal.Now.instant();
    const tokenHash = randomUUID();
    const session = await repository.createSession({
      userId: user.id,
      jti: options?.jti ?? randomUUID(),
      familyId: options?.familyId ?? randomUUID(),
      refreshTokenHash: tokenHash,
      expiresAt: options?.expired ? now.subtract({ seconds: 1 }) : now.add({ hours: 1 }),
      absoluteExpiresAt: now.add({ hours: 24 }),
      rememberMe: false,
    });
    if (options?.revoked) {
      await dbModule.db.orm.public.Session
        .where({ id: session.id })
        .update({ revokedAt: now });
    }
    return { session, tokenHash };
  };

  const rotate = (
    session: Awaited<ReturnType<typeof createSession>>["session"],
    tokenHash: string,
    replacementJti: string = randomUUID(),
  ) => {
    const now = Temporal.Now.instant();
    return repository.rotateSession({
      userId: session.userId,
      currentJti: session.jti,
      currentTokenHash: tokenHash,
      replacementJti,
      replacementTokenHash: randomUUID(),
      replacementExpiresAt: now.add({ hours: 1 }),
      now,
    });
  };

  it("allows only one of two concurrent refresh attempts to rotate", async () => {
    const { session, tokenHash } = await createSession();
    const results = await Promise.all([
      rotate(session, tokenHash),
      rotate(session, tokenHash),
    ]);

    expect(results.filter(({ status }) => status === "rotated")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "replayed")).toHaveLength(1);
  });

  it("rejects revoked and expired sessions", async () => {
    const revoked = await createSession({ revoked: true });
    const expired = await createSession({ expired: true });

    await expect(rotate(revoked.session, revoked.tokenHash)).resolves.toEqual({
      status: "invalid",
    });
    await expect(rotate(expired.session, expired.tokenHash)).resolves.toEqual({
      status: "invalid",
    });
  });

  it("revokes the active token family when a consumed token is replayed", async () => {
    const { session, tokenHash } = await createSession();
    const first = await rotate(session, tokenHash);
    expect(first.status).toBe("rotated");

    await expect(rotate(session, tokenHash)).resolves.toEqual({
      status: "replayed",
    });

    const family = await dbModule.db.orm.public.Session
      .where({ familyId: session.familyId })
      .all();
    expect(family).toHaveLength(2);
    expect(family.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
  });

  it("rolls consumption back if replacement creation fails", async () => {
    const { session, tokenHash } = await createSession();
    const blocker = await createSession();

    await expect(
      rotate(session, tokenHash, blocker.session.jti),
    ).rejects.toBeDefined();

    const unchanged = await dbModule.db.orm.public.Session.first({
      id: session.id,
    });
    expect(unchanged?.consumedAt).toBeNull();
    expect(unchanged?.revokedAt).toBeNull();
    expect(unchanged?.replacedByJti).toBeNull();
  });
});
