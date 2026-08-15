// backend/drizzle.config.ts

import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.mysql.js",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});