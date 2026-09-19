import { defineConfig } from "vitest/config";

const testDatabaseUrl = "postgresql://test:test@127.0.0.1:1/express_starter_test";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
      PORT: "5001",
      LOG_LEVEL: "silent",
      DATABASE_URL: testDatabaseUrl,
      JWT_ACCESS_SECRET: "access-test-secret-access-test-secret",
      JWT_REFRESH_SECRET: "refresh-test-secret-refresh-test-secret",
      JWT_ACCESS_EXPIRES_IN: "15m",
      SESSION_IDLE_TTL: "24h",
      SESSION_REMEMBER_ME_IDLE_TTL: "7d",
      SESSION_ABSOLUTE_TTL: "30d",
      SESSION_REVOKED_RETENTION: "30d",
      RATE_LIMIT_STORE: "memory",
      REDIS_URL: "",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/prisma/contract.d.ts"],
      thresholds: {
        statements: 70,
        branches: 45,
        functions: 70,
        lines: 70,
      },
    },
  },
});
