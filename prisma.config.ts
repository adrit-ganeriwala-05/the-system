import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  // Prisma Migrate/Studio need a direct (non-pooled) connection to run DDL.
  // The running app uses DATABASE_URL (pooled) via the driver adapter in lib/prisma.ts.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
