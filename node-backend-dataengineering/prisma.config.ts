/**
 * NOTE: This file is NOT needed for Prisma 5.x.
 *
 * prisma.config.ts is a Prisma 6/7+ feature.
 * We are currently using Prisma v5.22.0, where the DATABASE_URL
 * is configured directly in prisma/schema.prisma via:
 *
 *   datasource db {
 *     provider = "postgresql"
 *     url      = env("DATABASE_URL")
 *   }
 *
 * To configure your database connection, set DATABASE_URL in your .env file:
 *   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/xero_dataeng?schema=public"
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
