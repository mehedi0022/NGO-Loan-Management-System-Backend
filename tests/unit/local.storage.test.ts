import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";

import { createLocalStorage } from "../../src/modules/upload/local.storage.js";

describe("local upload storage", () => {
  it("writes a validated input beneath the configured directory and deletes it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "express-upload-"));
    const storage = createLocalStorage(root);
    const stored = await storage.upload({ buffer: Buffer.from([0xff, 0xd8, 0xff]), mimeType: "image/jpeg", size: 3, folder: "avatars" });
    expect(stored.url).toMatch(/^\/uploads\/avatars\//);
    await expect(readFile(path.join(root, stored.key))).resolves.toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    await storage.delete(stored.key);
    await expect(readFile(path.join(root, stored.key))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
