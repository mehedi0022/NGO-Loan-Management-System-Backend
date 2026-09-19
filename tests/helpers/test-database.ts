const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export const getTestDatabaseUrl = (): string => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Database tests require NODE_ENV=test");
  }

  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error("Set TEST_DATABASE_URL to run opt-in database tests");
  }

  const url = new URL(value);
  const databaseName = url.pathname.slice(1).toLowerCase();

  if (!databaseName.includes("test")) {
    throw new Error("TEST_DATABASE_URL database name must contain 'test'");
  }

  if (
    !localHosts.has(url.hostname) &&
    process.env.ALLOW_REMOTE_TEST_DATABASE !== "true"
  ) {
    throw new Error(
      "Remote database tests require ALLOW_REMOTE_TEST_DATABASE=true",
    );
  }

  return value;
};
