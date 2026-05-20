// backend/src/db/schema.js

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  date,
  jsonb,
  integer
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  user_name: varchar("user_name", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  assigned_building: varchar("assigned_building", { length: 20 }).notNull(),
  factory: varchar("factory", { length: 20 }).notNull(),
  profile_picture: text("profile_picture"),
  profile_picture_id: text("profile_picture_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cutting_entries = pgTable("cutting_entries", {
  id: serial("id").primaryKey(),
 
  // Scope
  factory:           varchar("factory",           { length: 50 }).notNull(),
  assigned_building: varchar("assigned_building", { length: 50 }).notNull(),
 
  // Entry identity
  work_date: date("work_date").notNull(),          // The working day
  line:      varchar("line", { length: 50 }).notNull(), // e.g. "Line 1"
 
  // Style info (user fills each entry)
  style: varchar("style", { length: 100 }).notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  buyer: varchar("buyer", { length: 100 }).notNull(),
  item:  varchar("item",  { length: 100 }),
 
  // Size-wise quantities  { "S": 120, "M": 200 }
  size_quantities: jsonb("size_quantities").notNull().default({}),
 
  // Computed total
  total_pcs: integer("total_pcs").notNull().default(0),
 
  // Audit
  created_by: varchar("created_by", { length: 100 }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: false }).defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: false }).defaultNow(),
});
 
// Drizzle migration SQL (run once):
// CREATE TABLE cutting_entries (
//   id               SERIAL PRIMARY KEY,
//   factory          VARCHAR(50)  NOT NULL,
//   assigned_building VARCHAR(50) NOT NULL,
//   work_date        DATE         NOT NULL,
//   line             VARCHAR(50)  NOT NULL,
//   style            VARCHAR(100) NOT NULL,
//   color            VARCHAR(100) NOT NULL,
//   model            VARCHAR(100) NOT NULL,
//   buyer            VARCHAR(100) NOT NULL,
//   item             VARCHAR(100),
//   size_quantities  JSONB        NOT NULL DEFAULT '{}',
//   total_pcs        INTEGER      NOT NULL DEFAULT 0,
//   created_by       VARCHAR(100) NOT NULL,
//   created_at       TIMESTAMP    DEFAULT NOW(),
//   updated_at       TIMESTAMP    DEFAULT NOW()
// );