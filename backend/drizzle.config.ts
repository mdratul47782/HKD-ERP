// backend/drizzle.config.js

import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

const USE_LOCAL = process.env.USE_LOCAL_DB === "true";

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: USE_LOCAL
    ? {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "PERN-Auth_template-DB",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "ratul",
        ssl: false,
      }
    : {
        url: process.env.DATABASE_URL,
      },
});