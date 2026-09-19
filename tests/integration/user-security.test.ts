import argon2 from "argon2";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const state = { lookupUser: null as Record<string, unknown> | null };
  const userSelect = vi.fn();
  const userWhere = vi.fn();
  const sessionCreate = vi.fn();

  return {
    state,
    userSelect,
    userWhere,
    sessionCreate,
    db: {
      orm: {
        public: {
          User: { select: userSelect, where: userWhere },
          Session: { create: sessionCreate },
        },
      },
      close: vi.fn(),
    },
  };
});

vi.mock("../../src/prisma/db.js", () => ({ db: database.db }));

const [{ default: app }, jwt] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/utils/jwt.util.js"),
]);

const timestamps = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const rawUser: Record<string, unknown> = {
  id: 1,
  email: "user@example.com",
  userName: "starter-user",
  fullName: "Starter User",
  password: "",
  role: "USER",
  ...timestamps,
};

const project = (record: Record<string, unknown>, fields: string[]) =>
  Object.fromEntries(fields.map((field) => [field, record[field]]));

const expectNoSensitiveUserFields = (value: unknown) => {
  expect(JSON.stringify(value).toLowerCase()).not.toMatch(
    /password|passwordhash|resettoken|verificationtoken/,
  );
};

beforeAll(async () => {
  rawUser.password = await argon2.hash("Password1!");
});

beforeEach(() => {
  database.state.lookupUser = { ...rawUser, role: "USER" };
  database.userSelect.mockImplementation((...fields: string[]) => {
    const collection = {
      first: vi.fn(async () => database.state.lookupUser),
      all: vi.fn(async () => [project(rawUser, fields)]),
      create: vi.fn(async (data: Record<string, unknown>) =>
        project({ ...rawUser, ...data }, fields),
      ),
      aggregate: vi.fn(async () => ({ total: 1 })),
      where: vi.fn(() => collection),
      orderBy: vi.fn(() => collection),
      offset: vi.fn(() => collection),
      limit: vi.fn(() => collection),
    };

    return collection;
  });
  database.userWhere.mockImplementation(({ id }: { id: number }) => ({
    select: vi.fn((...fields: string[]) => ({
      update: vi.fn(async (data: Record<string, unknown>) => {
        if (!database.state.lookupUser || database.state.lookupUser.id !== id) return null;
        database.state.lookupUser = { ...database.state.lookupUser, ...data };
        return project(database.state.lookupUser, fields);
      }),
      delete: vi.fn(async () => {
        if (!database.state.lookupUser || database.state.lookupUser.id !== id) return null;
        const deleted = project(database.state.lookupUser, fields);
        database.state.lookupUser = null;
        return deleted;
      }),
    })),
  }));
  database.sessionCreate.mockResolvedValue({ id: 1 });
});

describe("user API security boundary", () => {
  it("rejects unauthenticated user-list requests", async () => {
    const response = await request(app).get("/api/v1/users");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false });
  });

  it("rejects signed access tokens with invalid runtime payloads", async () => {
    const token = jwt.signAccessToken({ userId: -1 });
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("forbids an ordinary authenticated user from enumerating users", async () => {
    const token = jwt.signAccessToken({ userId: 1 });
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("lets an admin list users and returns only public fields", async () => {
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const token = jwt.signAccessToken({ userId: 2 });
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expectNoSensitiveUserFields(response.body);
    expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(Object.keys(response.body.data[0]).sort()).toEqual([
      "createdAt",
      "email",
      "fullName",
      "id",
      "role",
      "updatedAt",
      "userName",
    ]);
  });

  it("bounds user-list pagination and returns accurate metadata", async () => {
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const token = jwt.signAccessToken({ userId: 2 });

    const response = await request(app)
      .get("/api/v1/users?page=2&limit=100&sortBy=email&sortOrder=asc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 2, limit: 100, total: 1, totalPages: 1 });
    expectNoSensitiveUserFields(response.body.data);
  });

  it("rejects unbounded, unsupported, and arbitrary user-list query parameters", async () => {
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const token = jwt.signAccessToken({ userId: 2 });

    const [tooLarge, invalidSort, arbitraryFilter] = await Promise.all([
      request(app).get("/api/v1/users?limit=101").set("Authorization", `Bearer ${token}`),
      request(app).get("/api/v1/users?sortBy=password").set("Authorization", `Bearer ${token}`),
      request(app).get("/api/v1/users?password=anything").set("Authorization", `Bearer ${token}`),
    ]);

    for (const response of [tooLarge, invalidSort, arbitraryFilter]) {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    }
  });

  it("accepts only the allowlisted role filter", async () => {
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const token = jwt.signAccessToken({ userId: 2 });

    const response = await request(app)
      .get("/api/v1/users?role=USER")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(database.userSelect.mock.results.some((result) =>
      result.value.where.mock.calls.some(
        (call: unknown[]) => (call[0] as { role?: string } | undefined)?.role === "USER",
      ),
    )).toBe(true);
  });

  it("allows self-read but rejects access to another user's detail", async () => {
    const ownToken = jwt.signAccessToken({ userId: 1 });
    const own = await request(app).get("/api/v1/users/1").set("Authorization", `Bearer ${ownToken}`);
    const other = await request(app).get("/api/v1/users/2").set("Authorization", `Bearer ${ownToken}`);

    expect(own.status).toBe(200);
    expect(other.status).toBe(403);
    expectNoSensitiveUserFields(own.body);
  });

  it("allows an admin to read another user", async () => {
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const token = jwt.signAccessToken({ userId: 2 });
    const response = await request(app).get("/api/v1/users/1").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
  });

  it("enforces ownership on profile updates and blocks privileged fields", async () => {
    const token = jwt.signAccessToken({ userId: 1 });
    const denied = await request(app)
      .patch("/api/v1/users/2")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Changed Name" });
    const escalation = await request(app)
      .patch("/api/v1/users/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN" });
    const allowed = await request(app)
      .patch("/api/v1/users/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Changed Name" });

    expect(denied.status).toBe(403);
    expect(escalation.status).toBe(400);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.fullName).toBe("Changed Name");
  });

  it("reserves user deletion for admins", async () => {
    const userToken = jwt.signAccessToken({ userId: 1 });
    const forbidden = await request(app)
      .delete("/api/v1/users/1")
      .set("Authorization", `Bearer ${userToken}`);
    database.state.lookupUser = { ...rawUser, role: "ADMIN" };
    const adminToken = jwt.signAccessToken({ userId: 2 });
    const deleted = await request(app)
      .delete("/api/v1/users/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(forbidden.status).toBe(403);
    expect(deleted.status).toBe(204);
  });

  it("does not expose duplicate account creation through POST /users", async () => {
    const token = jwt.signAccessToken({ userId: 1 });
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(404);
  });

  it("never exposes password fields in registration responses", async () => {
    database.state.lookupUser = null;
    const response = await request(app).post("/api/v1/auth/register").send({
      userName: rawUser.userName,
      fullName: rawUser.fullName,
      email: rawUser.email,
      password: "Password1!",
    });

    expect(response.status).toBe(201);
    expectNoSensitiveUserFields(response.body);
  });

  it("never exposes password fields in login responses", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: rawUser.email,
      password: "Password1!",
      rememberMe: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expectNoSensitiveUserFields(response.body.data.user);
  });
});
