// backend/src/db/db.js
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.mysql.js";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || "HKD-ERP-DB",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  // Without this, mysql2 converts every DATE/DATETIME/TIMESTAMP column
  // into a JS Date object on the way out, built using the connection's
  // session timezone. That Date object then gets serialized by
  // res.json()/JSON.stringify() via .toISOString(), which always
  // converts to UTC -- shifting the calendar date by a day for anyone
  // on a positive UTC offset (e.g. Dhaka, UTC+6) whenever the local
  // time was before the offset (e.g. before 6am local).
  //
  // dateStrings: true makes mysql2 return these columns as plain
  // "YYYY-MM-DD" (or "YYYY-MM-DD HH:MM:SS") strings instead -- exactly
  // what's stored in the DB, no Date object, no timezone math, ever.
  // This is what actually fixes the off-by-one-day bug end-to-end;
  // the earlier excelDateToISO fix only ensured the correct string was
  // written IN -- this fixes it coming back OUT.
  dateStrings: true,
});

const db = drizzle(pool, { schema, mode: "default" });

console.log("🟠 Connected to MySQL");

export { db, schema };