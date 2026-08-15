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
  date,
  decimal,
  foreignKey,
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

// ================= Material Warehouse: Material Receive =================
//
// Workflow: Receive (pending, no location) -> Location Assignment (per
// Item Code/PDM + Color batch, sets location + flips to approved) ->
// Available Stock / Stock Search (reads only approved batches).
//
// A "batch" = one row in material_receive_items. Because it is tied to one
// parent Receive (one Date/Invoice) + one Item Code/PDM + one Color, two
// receives of the same Item Code/PDM + Color on different dates naturally
// stay as separate batches/rows — they are never summed together. This is
// also what will let a future Cutting Issue module walk batches oldest
// Date first (FIFO), and optionally target one specific Location + Batch.

// Parent table — one row per "Material Receive" form submission
export const materialReceives = mysqlTable("material_receives", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  invoiceNo: varchar("invoice_no", { length: 100 }).notNull(),
  fromType: varchar("from_type", { length: 20 }).notNull(),
  warehouse: varchar("warehouse", { length: 10 }).notNull().default("K-2"), // "K-1" | "K-2" | "K-3"
  buyer: varchar("buyer", { length: 150 }).notNull(),
  season: varchar("season", { length: 100 }).notNull(),
  po: varchar("po", { length: 150 }).notNull(),
  item: varchar("item", { length: 150 }).notNull(),
  buy: varchar("buy", { length: 150 }).notNull(),
  remark: varchar("remark", { length: 255 }), // optional free text, never required
  status: mysqlEnum("status", ["pending", "approved"]).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Child table — one row per Style, each with its own Model.
// (One Style = one Model; multiple Styles on one Receive each carry their
// own Model separately.)
export const materialReceiveStyles = mysqlTable(
  "material_receive_styles",
  {
    id: serial("id").primaryKey(),
    materialReceiveId: bigint("material_receive_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    style: varchar("style", { length: 100 }).notNull(),
    model: varchar("model", { length: 150 }),
  },
  (table) => ({
    materialReceiveFk: foreignKey({
      columns: [table.materialReceiveId],
      foreignColumns: [materialReceives.id],
      name: "mrs_material_receive_fk",
    }).onDelete("cascade"),
  })
);

// Child table — one row per Item Code/PDM + Color = one Stock Batch.
// "Item Code" and "PDM" are the same thing, so there is only itemCodePdm.
// No Location is set here (Receive never assigns Location/Rack). Location
// is added later by the Location Assignment step, which also flips
// status to "approved". availableRoll/availableYds start out equal to
// rollQty/yds and are the only fields a future Cutting Issue module should
// decrement — rollQty/yds stay as the immutable "as received" record.
export const materialReceiveItems = mysqlTable(
  "material_receive_items",
  {
    id: serial("id").primaryKey(),
    materialReceiveId: bigint("material_receive_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    itemCodePdm: varchar("item_code_pdm", { length: 150 }).notNull(),
    color: varchar("color", { length: 100 }).notNull(),
    rollQty: int("roll_qty").notNull(), // as received, immutable
    yds: decimal("yds", { precision: 10, scale: 2 }).notNull(), // as received, immutable
    availableRoll: int("available_roll").notNull(), // decremented by future Cutting Issue
    availableYds: decimal("available_yds", { precision: 10, scale: 2 }).notNull(), // decremented by future Cutting Issue
    location: varchar("location", { length: 100 }), // Rack/Location, null until approved
    status: mysqlEnum("status", ["pending", "approved"]).notNull().default("pending"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    materialReceiveFk: foreignKey({
      columns: [table.materialReceiveId],
      foreignColumns: [materialReceives.id],
      name: "mri_material_receive_fk",
    }).onDelete("cascade"),
  })
);

// Stock History — the ledger of every movement against a stock batch.
// Written today for "receive" (batch created) and "location_assignment"
// (batch approved with a Location/Rack). A future Cutting Issue module
// will add "issue" rows here as it decrements availableRoll/availableYds
// on material_receive_items — the batch row plus this ledger is what keeps
// FIFO (oldest Receive Date issued first) and per-Location + per-Batch
// issuing auditable from now on. History rows cascade away with their batch
// or parent Receive, so correcting/deleting a still-pending Receive never
// leaves orphaned history.
export const stockHistory = mysqlTable(
  "stock_history",
  {
    id: serial("id").primaryKey(),
    batchId: bigint("batch_id", { mode: "number", unsigned: true }).notNull(), // -> material_receive_items.id
    materialReceiveId: bigint("material_receive_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    action: mysqlEnum("action", ["receive", "location_assignment", "issue", "adjustment"])
      .notNull()
      .default("receive"),
    location: varchar("location", { length: 100 }), // Location/Rack at the time of the movement
    rollQty: int("roll_qty").notNull(), // rolls moved in this action
    yds: decimal("yds", { precision: 10, scale: 2 }).notNull(), // yds moved in this action
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    batchFk: foreignKey({
      columns: [table.batchId],
      foreignColumns: [materialReceiveItems.id],
      name: "sh_batch_fk",
    }).onDelete("cascade"),
    receiveFk: foreignKey({
      columns: [table.materialReceiveId],
      foreignColumns: [materialReceives.id],
      name: "sh_receive_fk",
    }).onDelete("cascade"),
  })
);