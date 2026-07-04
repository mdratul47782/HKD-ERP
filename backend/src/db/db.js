// backend/src/db/db.js

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleLocal } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema.js";
dotenv.config();

const { Pool } = pkg;

const USE_LOCAL = process.env.USE_LOCAL_DB === "true";

let db;

if (USE_LOCAL) {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "PERN-Auth_template-DB",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "ratul",
  });
  db = drizzleLocal(pool, { schema });
  console.log("🟢 Connected to LOCAL PostgreSQL ");
} else {
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql, { schema });
  console.log("🔵 Connected to NEON (Cloud) PostgreSQL");
}

export { db };
