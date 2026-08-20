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
// Workflow: Receive (pending_inspection, nothing inspected/racked yet) ->
// Material Inspection (approve a Passed Roll/Yds <= received amount; the
// rest is auto-recorded as Rejected) -> Location Assignment (only the
// PASSED qty becomes assignable, and can be split across MULTIPLE racks,
// each tracked as its own row in material_receive_item_locations) ->
// Available Stock / Stock Search (reads only rack allocations, i.e.
// quantity that has actually been placed somewhere).
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
// below.
//
// INSPECTION FIELDS (Material Inspection module):
//   passedRoll/passedYds     -> how much of this batch QC approved
//   rejectedRoll/rejectedYds -> received - passed (auto-computed)
//   inspectedAt/inspectionNote/isRead -> inspection metadata + bell state
//
// unassignedRoll/unassignedYds = how much of the batch has PASSED
// inspection but NOT yet been put on a rack. They stay 0 until
// inspection happens, then get set to passedRoll/passedYds, then get
// decremented every time a new rack allocation is created (and
// incremented back if an allocation is edited down or removed).
// rollQty/yds stay immutable "as received".
//
// status:
//   "pending_inspection" -> just received, not inspected yet
//   "pending"             -> inspected, some/all passed, nothing racked yet
//   "partial"             -> some racked, some still unassigned
//   "approved"            -> unassignedRoll/Yds === 0 (fully racked)
//   "rejected"            -> inspection passed 0 Roll / 0 Yds; never
//                             appears on Location Assignment
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

    // --- Inspection outcome (set once, by Material Inspection) ---
    passedRoll: int("passed_roll").notNull().default(0),
    passedYds: decimal("passed_yds", { precision: 10, scale: 2 }).notNull().default("0"),
    rejectedRoll: int("rejected_roll").notNull().default(0),
    rejectedYds: decimal("rejected_yds", { precision: 10, scale: 2 }).notNull().default("0"),
    inspectedAt: timestamp("inspected_at"),
    inspectionNote: varchar("inspection_note", { length: 255 }),
    isRead: boolean("is_read").notNull().default(false), // Material Inspection notification bell

    unassignedRoll: int("unassigned_roll").notNull(), // still needs a rack -- 0 until inspected
    unassignedYds: decimal("unassigned_yds", { precision: 10, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pending_inspection", "pending", "partial", "approved", "rejected"])
      .notNull()
      .default("pending_inspection"),
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
// "inspection" = Material Inspection recorded Passed/Rejected qty.
// "location_assignment" = qty put on a rack (new allocation created).
// "adjustment" = an existing allocation was edited/moved/removed.
// "issue" = Cutting Issue decrement of an allocation's available qty.
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
    action: mysqlEnum("action", ["receive", "location_assignment", "issue", "adjustment", "inspection"])
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
// ================= Cutting: Requisition -> Cutting Issue =================
//
// Workflow: Cutting submits a Requisition (Date, Buyer, Floor, Season,
// Style, Model + one or more Item Code/PDM + Color + Pcs + Wastage % +
// Consumption rows) -> it shows up as a notification on the Material
// Warehouse's "Cutting Issue" page -> the warehouse user picks which
// rack(s) to issue from (reading the SAME material_receive_item_locations
// table Material Stock reads from) -> issuing decrements that rack's
// availableRoll/Yds (exactly like a Cutting Issue draws down real shelf
// stock) and increments the requisition item's issuedRoll/Yds ->
// everything is logged to cutting_issues (the "History" ledger for this
// module) AND to the existing stock_history table (action "issue") so the
// master stock ledger stays consistent with Location Assignment's audit
// trail.
//
// NOTE: Cutting only ever thinks in Pcs/Consumption/Yds -- it has no idea
// how many Rolls a given Yds figure needs (that depends on what's
// physically on the shelf), so there is no "Requested Roll" anymore.
// Requested Yds is calculated automatically:
//     requestedYds = Pcs x Consumption x (1 + WastagePercentage/100)
// Roll is entirely a Material Warehouse decision made at issue time, and
// issuedRoll simply accumulates whatever Roll quantity was actually pulled
// off the racks to cover the requested Yds. PO is intentionally NOT part
// of a Requisition -- Cutting requisitions are tracked by Buyer/Floor/
// Season/Style/Model instead.

// Parent table -- one row per Requisition form submission from Cutting.
export const cuttingRequisitions = mysqlTable("cutting_requisitions", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  buyer: varchar("buyer", { length: 150 }).notNull(),
  floor: varchar("floor", { length: 10 }).notNull(), // "A-2" | "B-2" | "A-3" | "B-3" | "A-4" | "B-4" | "A-5" | "B-5" | "A-6" | "B-6"
  season: varchar("season", { length: 100 }).notNull(),
  style: varchar("style", { length: 100 }).notNull(),
  model: varchar("model", { length: 150 }),
  // pending -> nothing issued yet | partial -> some items issued, some not
  // | fulfilled -> every item's issued Yds has reached (or passed) its
  // requested Yds
  status: mysqlEnum("status", ["pending", "partial", "fulfilled"]).notNull().default("pending"),
  // Bell-icon notification read state on the Material Warehouse side.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Child table -- one row per Item Code/PDM + Color requested on a
// Requisition. pcs/percentage(wastage %)/consumption are what Cutting
// actually enters; requestedYds is calculated from them server-side and
// stored immutable "as requested". issuedRoll/issuedYds accumulate every
// time the warehouse issues against this row (possibly from multiple
// racks / multiple visits, and the warehouse is free to issue MORE than
// requestedYds if needed -- there is no hard cap, only a confirmation
// prompt on the frontend).
export const cuttingRequisitionItems = mysqlTable(
  "cutting_requisition_items",
  {
    id: serial("id").primaryKey(),
    cuttingRequisitionId: bigint("cutting_requisition_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    itemCodePdm: varchar("item_code_pdm", { length: 150 }).notNull(),
    color: varchar("color", { length: 100 }).notNull(),
    pcs: int("pcs").notNull(),
    percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull().default("0"), // wastage %
    consumption: decimal("consumption", { precision: 10, scale: 3 }).notNull(), // yds per pcs
    requestedYds: decimal("requested_yds", { precision: 10, scale: 2 }).notNull(), // = pcs * consumption * (1 + percentage/100)
    issuedRoll: int("issued_roll").notNull().default(0), // Roll is a Warehouse-side decision, no requested counterpart
    issuedYds: decimal("issued_yds", { precision: 10, scale: 2 }).notNull().default(0),
    status: mysqlEnum("status", ["pending", "partial", "fulfilled"]).notNull().default("pending"),
    fulfilledAt: timestamp("fulfilled_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    requisitionFk: foreignKey({
      columns: [table.cuttingRequisitionId],
      foreignColumns: [cuttingRequisitions.id],
      name: "cri_requisition_fk",
    }).onDelete("cascade"),
  })
);

// One row per actual "issue" action -- Requisition Item + which rack
// allocation it was drawn from + how much. This is the real, readable
// "History" ledger for the Cutting Issue page (who got how much, from
// which rack, when). A single Requisition Item can end up with several
// of these rows if it was issued from multiple racks and/or on multiple
// occasions (partial issue).
export const cuttingIssues = mysqlTable(
  "cutting_issues",
  {
    id: serial("id").primaryKey(),
    requisitionItemId: bigint("requisition_item_id", { mode: "number", unsigned: true }).notNull(),
    cuttingRequisitionId: bigint("cutting_requisition_id", { mode: "number", unsigned: true }).notNull(),
    allocationId: bigint("allocation_id", { mode: "number", unsigned: true }).notNull(), // -> material_receive_item_locations.id
    itemId: bigint("item_id", { mode: "number", unsigned: true }).notNull(), // -> material_receive_items.id (the batch)
    location: varchar("location", { length: 100 }).notNull(), // Rack it was pulled from, at time of issue
    rollQty: int("roll_qty").notNull(),
    yds: decimal("yds", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    requisitionItemFk: foreignKey({
      columns: [table.requisitionItemId],
      foreignColumns: [cuttingRequisitionItems.id],
      name: "ci_requisition_item_fk",
    }).onDelete("cascade"),
    requisitionFk: foreignKey({
      columns: [table.cuttingRequisitionId],
      foreignColumns: [cuttingRequisitions.id],
      name: "ci_requisition_fk",
    }).onDelete("cascade"),
    allocationFk: foreignKey({
      columns: [table.allocationId],
      foreignColumns: [materialReceiveItemLocations.id],
      name: "ci_allocation_fk",
    }).onDelete("cascade"),
    itemFk: foreignKey({
      columns: [table.itemId],
      foreignColumns: [materialReceiveItems.id],
      name: "ci_item_fk",
    }).onDelete("cascade"),
  })
);