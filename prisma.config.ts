import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

const isContractOnlyCommand = process.argv.includes("contract");
let database: { connection: string } | undefined;

if (!isContractOnlyCommand) {
  const { database: databaseConfig } = (await import("./src/config/env.js"))
    .config;
  const connection = new URL(databaseConfig.migrationUrl);

  if (databaseConfig.tls.mode === "verify-full") {
    connection.searchParams.set("sslmode", "verify-full");
  }

  database = { connection: connection.toString() };
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: database,
  }),
});
