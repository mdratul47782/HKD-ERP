// backend/src/db/schema.mysql.js

import {
  bigint,
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  user_name: varchar("user_name", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  assigned_building: varchar("assigned_building", { length: 20 }).notNull(),
  factory: varchar("factory", { length: 20 }).notNull(),
  profile_picture: text("profile_picture"),
  profile_picture_id: text("profile_picture_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Style Register                                                      */
/* ------------------------------------------------------------------ */

export const STYLE_STATUS_VALUES = [
  "Pending",
  "Approved",
  "In Production",
  "Completed",
  "Cancelled",
];

export const styles = mysqlTable("styles", {
  id: serial("id").primaryKey(),

  customer_name: varchar("customer_name", { length: 200 }).notNull(),
  brand: varchar("brand", { length: 150 }),
  style_name: varchar("style_name", { length: 200 }).notNull(),
  style_number: varchar("style_number", { length: 100 }).notNull().unique(),
  description: text("description"),
  model: varchar("model", { length: 100 }),
  color: varchar("color", { length: 100 }),

  season_year: varchar("season_year", { length: 10 }),
  season: varchar("season", { length: 20 }),
  product_type: varchar("product_type", { length: 50 }),

  // main/cover image + full gallery
  image: text("image"),
  images: json("images"),

  status: mysqlEnum("status", STYLE_STATUS_VALUES).default("Pending").notNull(),
  is_active: boolean("is_active").default(true).notNull(),

  created_by: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id
  ),
  // "Date of submit"
  submitted_at: timestamp("submitted_at").defaultNow().notNull(),
  // "Update date" — auto-refreshes on every UPDATE
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const style_releases = mysqlTable("style_releases", {
  id: serial("id").primaryKey(),
  style_id: bigint("style_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => styles.id, { onDelete: "cascade" }),
  qty: int("qty").notNull(),
  // date-time the release was added
  release_date: timestamp("release_date").defaultNow().notNull(),
  created_by: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id
  ),
});