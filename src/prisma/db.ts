import { readFileSync } from "node:fs";
import { Pool, type PoolConfig } from "pg";
import postgres from "@prisma/orm-postgres/runtime";
import { Temporal } from "temporal-polyfill";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };
import { config } from "../config/env.js";

// Prisma's temporal mutation defaults resolve through globalThis.Temporal.
// Node 24 does not provide it natively yet, so install the project's polyfill.
const runtimeGlobals = globalThis as typeof globalThis & {
  Temporal?: typeof Temporal;
};
runtimeGlobals.Temporal ??= Temporal;

const tls = config.database.tls;
const poolConfig: PoolConfig = {
  connectionString: config.database.runtimeUrl,
  max: config.database.pool.max,
  connectionTimeoutMillis: config.database.pool.connectionTimeoutMs,
  idleTimeoutMillis: config.database.pool.idleTimeoutMs,
  ssl: tls.mode === "disable" ? false : {
    rejectUnauthorized: true,
    ...(tls.caFile ? { ca: readFileSync(tls.caFile, "utf8") } : {}),
  },
};

const pool = new Pool(poolConfig);
export const db = postgres<Contract>({ contractJson, pg: pool });

export const closeDatabase = async () => {
  await db.close();
  await pool.end();
};
