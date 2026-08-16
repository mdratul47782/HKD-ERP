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
// Workflow: Receive (pending, nothing racked) -> Location Assignment (a
// batch's roll/yds can be split across MULTIPLE racks, each tracked as its
// own row in material_receive_item_locations) -> Available Stock / Stock
// Search (reads only rack allocations, i.e. quantity that has actually
// been placed somewhere).
//
// A "batch" = one row in material_receive_items, tied to one parent
// Receive (one Date/Invoice) + one Item Code/PDM + one Color. Two receives
// of the same Item Code/PDM + Color on different dates stay as separate
// batches/rows — never summed together. This is also what lets a future
// Cutting Issue module walk batches oldest Date first (FIFO), and target
// one specific Location + Batch.

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

// Child table — one row per Item Code/PDM + Color = one Stock Batch (as
// received). Location is NOT stored here — a batch can be split across
// many racks, each tracked as its own row in material_receive_item_locations
// below. unassignedRoll/unassignedYds = how much of this batch has NOT yet
// been put on a rack; they start out equal to rollQty/yds and are
// decremented every time a new rack allocation is created (and incremented
// back if an allocation is edited down or removed). rollQty/yds stay
// immutable "as received".
//
// status:
//   "pending"  -> unassignedRoll/Yds === rollQty/yds (nothing racked yet)
//   "partial"  -> some racked, some still unassigned
//   "approved" -> unassignedRoll/Yds === 0 (fully racked)
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
    unassignedRoll: int("unassigned_roll").notNull(), // still needs a rack
    unassignedYds: decimal("unassigned_yds", { precision: 10, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pending", "partial", "approved"]).notNull().default("pending"),
    approvedAt: timestamp("approved_at"), // set when status first reaches "approved", cleared otherwise
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

// One row per (batch, rack) allocation — this is what lets a single batch
// be split across multiple racks (e.g. 70 rolls -> Rack-1, 30 -> Rack-2).
// rollQty/yds = how much of the batch was put on THIS rack (immutable
// "as assigned" for this allocation, unless the allocation itself is
// edited). availableRoll/availableYds = what's left on THIS specific rack
// after future Cutting Issue decrements it — that's the true "available
// stock" unit Material Stock search reads from.
//
// Editable/reassignable: an allocation's location or qty can be changed,
// or the allocation removed entirely, as long as availableRoll/availableYds
// still equal rollQty/yds (i.e. nothing has been issued from it yet).
export const materialReceiveItemLocations = mysqlTable(
  "material_receive_item_locations",
  {
    id: serial("id").primaryKey(),
    itemId: bigint("item_id", { mode: "number", unsigned: true }).notNull(), // -> material_receive_items.id
    materialReceiveId: bigint("material_receive_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    location: varchar("location", { length: 100 }).notNull(),
    rollQty: int("roll_qty").notNull(),
    yds: decimal("yds", { precision: 10, scale: 2 }).notNull(),
    availableRoll: int("available_roll").notNull(),
    availableYds: decimal("available_yds", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    itemFk: foreignKey({
      columns: [table.itemId],
      foreignColumns: [materialReceiveItems.id],
      name: "mril_item_fk",
    }).onDelete("cascade"),
    receiveFk: foreignKey({
      columns: [table.materialReceiveId],
      foreignColumns: [materialReceives.id],
      name: "mril_receive_fk",
    }).onDelete("cascade"),
  })
);

// Stock History — the ledger of every movement against a stock batch.
// "receive" = batch created (no allocation yet, allocationId null).
// "location_assignment" = qty put on a rack (new allocation created).
// "adjustment" = an existing allocation was edited/moved/removed.
// "issue" = future Cutting Issue decrement of an allocation's available qty.
export const stockHistory = mysqlTable(
  "stock_history",
  {
    id: serial("id").primaryKey(),
    batchId: bigint("batch_id", { mode: "number", unsigned: true }).notNull(), // -> material_receive_items.id
    allocationId: bigint("allocation_id", { mode: "number", unsigned: true }), // -> material_receive_item_locations.id, nullable
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
    allocationFk: foreignKey({
      columns: [table.allocationId],
      foreignColumns: [materialReceiveItemLocations.id],
      name: "sh_allocation_fk",
    }).onDelete("cascade"),
    receiveFk: foreignKey({
      columns: [table.materialReceiveId],
      foreignColumns: [materialReceives.id],
      name: "sh_receive_fk",
    }).onDelete("cascade"),
  })
);