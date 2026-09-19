import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import request from "supertest";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "../helpers/test-database.js";

const databaseTestsEnabled = process.env.RUN_DATABASE_TESTS === "true";
const frontendOrigin = "http://localhost:3000";

describe.skipIf(!databaseTestsEnabled)("session and logout lifecycle", () => {
  let app: Awaited<typeof import("../../src/app.js")>["default"];
  let dbModule: typeof import("../../src/prisma/db.js");
  let sessionRepository: typeof import(
    "../../src/modules/session/repositories/session.repository.js"
  );
  let sessionService: typeof import(
    "../../src/modules/session/services/session.service.js"
  );
  let tokenUtils: typeof import("../../src/utils/token.util.js");
  let jwtUtils: typeof import("../../src/utils/jwt.util.js");
  const users: Array<{ id: number; email: string; password: string }> = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.DATABASE_MIGRATION_URL = process.env.DATABASE_URL;
    process.env.DATABASE_TLS_MODE = "disable";
    [
      { default: app },
      dbModule,
      sessionRepository,
      sessionService,
      tokenUtils,
      jwtUtils,
    ] = await Promise.all([
      import("../../src/app.js"),
      import("../../src/prisma/db.js"),
      import("../../src/modules/session/repositories/session.repository.js"),
      import("../../src/modules/session/services/session.service.js"),
      import("../../src/utils/token.util.js"),
      import("../../src/utils/jwt.util.js"),
    ]);
  });

  afterAll(async () => {
    for (const user of users) {
      while (
        await dbModule.db.orm.public.Session.where({ userId: user.id }).delete()
      ) {
        // Drain all session rows before their parent user.
      }
      await dbModule.db.orm.public.User.where({ id: user.id }).delete();
    }
    await dbModule.closeDatabase();
  });

  const createUser = async () => {
    const password = "Password1!";
    const user = await dbModule.db.orm.public.User.create({
      email: `${randomUUID()}@session.test`,
      password: await argon2.hash(password),
    });
    const result = { id: user.id, email: user.email, password };
    users.push(result);
    return result;
  };

  const firstSetCookie = (response: request.Response) => {
    const header = response.headers["set-cookie"];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) throw new Error("Expected Set-Cookie header");
    return value;
  };

  const cookiePair = (setCookie: string) => setCookie.split(";", 1)[0]!;
  const cookieToken = (setCookie: string) =>
    decodeURIComponent(cookiePair(setCookie).slice(cookiePair(setCookie).indexOf("=") + 1));

  const login = async (
    agent: ReturnType<typeof request.agent>,
    rememberMe: boolean,
  ) => {
    const user = await createUser();
    const response = await agent.post("/api/v1/auth/login").send({
      email: user.email,
      password: user.password,
      rememberMe,
    });
    expect(response.status).toBe(200);
    return {
      user,
      accessToken: response.body.data.accessToken as string,
      setCookie: firstSetCookie(response),
    };
  };

  it("logs out the current session, clears its cookie, and is idempotent", async () => {
    const agent = request.agent(app);
    const loggedIn = await login(agent, true);
    const originalCookie = cookiePair(loggedIn.setCookie);

    const logoutResponse = await agent
      .post("/api/v1/auth/logout")
      .set("Origin", frontendOrigin);
    expect(logoutResponse.status).toBe(200);
    expect(firstSetCookie(logoutResponse)).toMatch(/Expires=Thu, 01 Jan 1970/i);

    const refreshWithRevokedToken = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", frontendOrigin)
      .set("Cookie", originalCookie);
    expect(refreshWithRevokedToken.status).toBe(401);

    const repeatedLogout = await agent
      .post("/api/v1/auth/logout")
      .set("Origin", frontendOrigin);
    expect(repeatedLogout.status).toBe(200);
  });

  it("logout-all revokes every session, including the current session", async () => {
    const user = await createUser();
    const loginAsSameUser = async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: user.password,
        rememberMe: true,
      });
      expect(response.status).toBe(200);
      return {
        accessToken: response.body.data.accessToken as string,
        cookie: cookiePair(firstSetCookie(response)),
      };
    };
    const first = await loginAsSameUser();
    const second = await loginAsSameUser();

    const response = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Origin", frontendOrigin)
      .set("Authorization", `Bearer ${first.accessToken}`)
      .set("Cookie", first.cookie);
    expect(response.status).toBe(200);
    expect(firstSetCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/i);

    for (const cookie of [first.cookie, second.cookie]) {
      const refresh = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Origin", frontendOrigin)
        .set("Cookie", cookie);
      expect(refresh.status).toBe(401);
    }
  });

  it("aligns rememberMe JWT, database, and cookie lifetimes", async () => {
    const standard = await login(request.agent(app), false);
    const remembered = await login(request.agent(app), true);
    expect(standard.setCookie).not.toMatch(/Max-Age=/i);
    const persistentMaxAge = Number(
      /Max-Age=(\d+)/i.exec(remembered.setCookie)?.[1],
    );
    expect(persistentMaxAge).toBeGreaterThanOrEqual(604_798);
    expect(persistentMaxAge).toBeLessThanOrEqual(604_800);

    for (const [loginResult, expectedSeconds] of [
      [standard, 86_400],
      [remembered, 604_800],
    ] as const) {
      const token = cookieToken(loginResult.setCookie);
      const claims = jwt.decode(token) as jwt.JwtPayload;
      expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBeCloseTo(expectedSeconds, -1);
      const session = await dbModule.db.orm.public.Session.first({
        refreshTokenHash: tokenUtils.hashToken(token),
      });
      expect(session).not.toBeNull();
      const dbSeconds = (
        session!.expiresAt.epochMilliseconds - session!.createdAt.epochMilliseconds
      ) / 1_000;
      expect(dbSeconds).toBeCloseTo(expectedSeconds, -1);
    }
  });

  it("caps refresh JWT and database expiry at the absolute lifetime", async () => {
    const user = await createUser();
    const now = Temporal.Now.instant();
    const absoluteExpiresAt = now.add({ minutes: 5 });
    const current = jwtUtils.issueRefreshToken({ userId: user.id }, 300_000);
    await sessionRepository.createSession({
      userId: user.id,
      jti: current.jti,
      familyId: randomUUID(),
      refreshTokenHash: tokenUtils.hashToken(current.token),
      expiresAt: absoluteExpiresAt,
      absoluteExpiresAt,
      rememberMe: true,
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", frontendOrigin)
      .set("Cookie", `refreshToken=${current.token}`);
    expect(response.status).toBe(200);
    const replacementToken = cookieToken(firstSetCookie(response));
    const replacement = await dbModule.db.orm.public.Session.first({
      refreshTokenHash: tokenUtils.hashToken(replacementToken),
    });
    expect(replacement?.expiresAt.equals(absoluteExpiresAt)).toBe(true);
    const claims = jwt.decode(replacementToken) as jwt.JwtPayload;
    expect((claims.exp ?? 0) * 1_000).toBeLessThanOrEqual(
      absoluteExpiresAt.epochMilliseconds + 1_000,
    );
  });

  it("rejects refresh after the absolute session lifetime", async () => {
    const user = await createUser();
    const now = Temporal.Now.instant();
    const current = jwtUtils.issueRefreshToken({ userId: user.id }, 3_600_000);
    await sessionRepository.createSession({
      userId: user.id,
      jti: current.jti,
      familyId: randomUUID(),
      refreshTokenHash: tokenUtils.hashToken(current.token),
      expiresAt: now.add({ hours: 1 }),
      absoluteExpiresAt: now.subtract({ seconds: 1 }),
      rememberMe: true,
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", frontendOrigin)
      .set("Cookie", `refreshToken=${current.token}`);
    expect(response.status).toBe(401);
  });

  it("cleans expired and old revoked sessions without deleting active ones", async () => {
    const user = await createUser();
    const now = Temporal.Now.instant();
    const makeSession = (expiresAt: Temporal.Instant) =>
      sessionRepository.createSession({
        userId: user.id,
        jti: randomUUID(),
        familyId: randomUUID(),
        refreshTokenHash: randomUUID(),
        expiresAt,
        absoluteExpiresAt: now.add({ hours: 24 }),
        rememberMe: false,
      });
    const expired = await makeSession(now.subtract({ seconds: 1 }));
    const oldRevoked = await makeSession(now.add({ hours: 1 }));
    const active = await makeSession(now.add({ hours: 1 }));
    await dbModule.db.orm.public.Session.where({ id: oldRevoked.id }).update({
      revokedAt: now.subtract({ hours: 24 * 31 }),
    });

    const deletedCount = await sessionService.cleanupSessions(now);
    expect(deletedCount).toBeGreaterThanOrEqual(2);
    expect(await dbModule.db.orm.public.Session.first({ id: expired.id })).toBeNull();
    expect(await dbModule.db.orm.public.Session.first({ id: oldRevoked.id })).toBeNull();
    expect(await dbModule.db.orm.public.Session.first({ id: active.id })).not.toBeNull();
  });
});
