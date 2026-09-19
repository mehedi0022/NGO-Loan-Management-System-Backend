import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Manifest = { from: string | null; to: string; migrationHash: string };
type Operation = { execute?: Array<{ sql: string }> };

const root = process.cwd();
const appMigrations = join(root, "migrations", "app");
const directories = readdirSync(appMigrations, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "refs")
  .map((entry) => entry.name)
  .sort();

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const manifests = directories.map((directory) =>
  readJson<Manifest>(join(appMigrations, directory, "migration.json")),
);
const operations = directories.flatMap((directory) =>
  readJson<Operation[]>(join(appMigrations, directory, "ops.json")),
);
const sql = operations.flatMap((operation) => operation.execute ?? []).map((query) => query.sql).join("\n");
const contract = readJson<{ storage: { storageHash: string } }>(join(root, "src", "prisma", "contract.json"));
const dbRef = readJson<{ hash: string }>(join(appMigrations, "refs", "db.json"));
const productionRef = readJson<{ hash: string }>(join(appMigrations, "refs", "production.json"));

describe("Prisma migration history", () => {
  it("forms one reproducible chain from empty to the authored contract", () => {
    expect(manifests[0]?.from).toBeNull();
    for (let index = 1; index < manifests.length; index += 1) {
      expect(manifests[index]?.from).toBe(manifests[index - 1]?.to);
    }
    expect(manifests.at(-1)?.to).toBe(contract.storage.storageHash);
    expect(dbRef.hash).toBe(contract.storage.storageHash);
    expect(productionRef.hash).toBe(contract.storage.storageHash);
    expect(manifests.every((manifest) => /^[a-f0-9]{64}$/.test(manifest.migrationHash))).toBe(true);
  });

  it("reproduces User and Session structure and integrity constraints", () => {
    expect(sql).toContain('CREATE TABLE "public"."user"');
    expect(sql).toContain('CREATE TABLE "public"."session"');
    expect(sql).toContain('UNIQUE ("email")');
    expect(sql).toContain('UNIQUE ("refreshTokenHash")');
    expect(sql).toContain('CREATE INDEX "session_userId_idx_a489d58a"');
    expect(sql).toContain('FOREIGN KEY ("userId")');
    expect(sql).toContain('REFERENCES "public"."user" ("id")');
  });

  it("includes the complete session lifetime fields in the baseline", () => {
    expect(sql).toContain('"absoluteExpiresAt" timestamptz NOT NULL');
    expect(sql).toContain('"expiresAt" timestamptz NOT NULL');
    expect(sql).toContain('"rememberMe" bool DEFAULT false NOT NULL');
  });

  it("adds a persisted, constrained user role with a safe default", () => {
    expect(sql).toContain('ADD COLUMN "role" text DEFAULT \'USER\' NOT NULL');
    expect(sql).toContain('CHECK ("role" IN (\'SUPER_ADMIN\', \'ADMIN\', \'USER\', \'CUSTOMER\', \'MODERATOR\', \'AUTHOR\', \'MANAGER\'))');
  });
});
