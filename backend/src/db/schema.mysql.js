import {
  date,
  int,
  json,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  user_name: varchar("user_name", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  assigned_building: varchar("assigned_building", { length: 20 }).notNull(),
  factory: varchar("factory", { length: 20 }).notNull(),
  profile_picture: text("profile_picture"),
  profile_picture_id: text("profile_picture_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cutting_entries = mysqlTable("cutting_entries", {
  id: serial("id").primaryKey(),
  factory: varchar("factory", { length: 50 }).notNull(),
  assigned_building: varchar("assigned_building", { length: 50 }).notNull(),
  work_date: date("work_date").notNull(),
  line: varchar("line", { length: 50 }).notNull(),
  style: varchar("style", { length: 100 }).notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  buyer: varchar("buyer", { length: 100 }).notNull(),
  item: varchar("item", { length: 100 }),
  size_quantities: json("size_quantities").notNull().default({}),
  total_pcs: int("total_pcs").notNull().default(0),
  created_by: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const json_payload_tests = mysqlTable("json_payload_tests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  payload: json("payload").notNull(),
  item_count: int("item_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});