import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import * as schema from "./schema.mysql.js";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || "PERN-Auth_template-DB",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
});

const db = drizzle(pool, { schema, mode: "default" });

console.log("🟠 Connected to MySQL");

// Insert a row, then fetch and return it by its new id
export async function insertAndReturn(table, values) {
  const [result] = await db.insert(table).values(values);
  const [row] = await db.select().from(table).where(eq(table.id, result.insertId));
  return row;
}

// Update row(s) matching whereClause, then fetch and return the (first) updated row
export async function updateAndReturn(table, values, whereClause) {
  await db.update(table).set(values).where(whereClause);
  const [row] = await db.select().from(table).where(whereClause);
  return row;
}

// Fetch the row first (so we still have it after deleting), then delete it
export async function deleteAndReturn(table, whereClause) {
  const [row] = await db.select().from(table).where(whereClause);
  if (!row) return null;
  await db.delete(table).where(whereClause);
  return row;
}

export { db, schema };