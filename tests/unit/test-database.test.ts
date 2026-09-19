import { afterEach, describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "../helpers/test-database.js";

const originalTestDatabaseUrl = process.env.TEST_DATABASE_URL;
const originalRemotePermission = process.env.ALLOW_REMOTE_TEST_DATABASE;

afterEach(() => {
  process.env.TEST_DATABASE_URL = originalTestDatabaseUrl;
  process.env.ALLOW_REMOTE_TEST_DATABASE = originalRemotePermission;
});

describe("test database safety guard", () => {
  it("requires an explicit test database URL", () => {
    delete process.env.TEST_DATABASE_URL;

    expect(() => getTestDatabaseUrl()).toThrow("Set TEST_DATABASE_URL");
  });

  it("rejects a database whose name is not marked for tests", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://test:test@127.0.0.1:5432/application";

    expect(() => getTestDatabaseUrl()).toThrow("must contain 'test'");
  });

  it("accepts an explicitly configured local test database", () => {
    const value =
      "postgresql://test:test@127.0.0.1:5432/application_test";
    process.env.TEST_DATABASE_URL = value;

    expect(getTestDatabaseUrl()).toBe(value);
  });

  it("rejects remote databases unless they are explicitly allowed", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://test:test@database.example.com:5432/application_test";
    delete process.env.ALLOW_REMOTE_TEST_DATABASE;

    expect(() => getTestDatabaseUrl()).toThrow(
      "ALLOW_REMOTE_TEST_DATABASE=true",
    );
  });
});
