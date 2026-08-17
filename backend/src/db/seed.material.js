// backend/src/db/seed.material.js
//
// Seeds the Material Warehouse tables (material_receives ->
// material_receive_styles / material_receive_items ->
// material_receive_item_locations -> stock_history) with realistic,
// internally-consistent fake data that follows the SAME workflow the app
// itself enforces:
//
//   1. A Material Receive is created (parent row + Style/Model rows).
//   2. Each Item Code/PDM + Color batch is created as "pending", with
//      unassignedRoll/Yds === rollQty/yds.
//   3. Some batches are then randomly "assigned" to 0, 1, 2 or 3 racks --
//      exactly like the real Location Assignment flow -- which:
//        - decrements the batch's unassignedRoll/Yds
//        - creates one row per (batch, rack) in
//          material_receive_item_locations, with availableRoll/Yds ===
//          rollQty/yds (nothing issued yet)
//        - flips the batch's status to "partial" or "approved"
//   4. A parent Material Receive only becomes "approved" once every one
//      of its item batches is "approved" (mirrors recomputeItemStatus()
//      in locationAssignment.controllers.js).
//   5. Every batch gets a "receive" stock_history row, and every rack
//      allocation gets its own "location_assignment" stock_history row.
//
// RUN:
//   npm run seed:material                -> 120 receives (default)
//   node src/db/seed.material.js 1000    -> 1000 receives
//   node src/db/seed.material.js 1000 --reset   -> wipes existing material
//                                                  warehouse data first
//
// WHY 120 BY DEFAULT, NOT 1000:
//   Each receive fans out into ~1-2 styles, ~1-3 item batches, ~0-3 rack
//   allocations per batch, and 1-2 stock_history rows per batch -- so one
//   receive averages out to roughly 9-10 total rows across every table
//   combined. 120 receives already lands you close to ~1000 TOTAL rows
//   across all 5 tables. If you specifically want 1000 rows in
//   material_receives itself (not ~1000 total), just pass 1000 as the
//   first argument -- see the RUN examples above.
//
// SAFE TO RE-RUN: by default this only ADDS more data (no deletes). Pass
// --reset (or set SEED_RESET=true) to wipe material_receives first --
// its ON DELETE CASCADE FKs take styles/items/locations/history with it.
// The `users` table is never touched.

import { eq } from "drizzle-orm";
import { db, schema } from "./db.js";

const {
  materialReceives,
  materialReceiveStyles,
  materialReceiveItems,
  materialReceiveItemLocations,
  stockHistory,
} = schema;

/* ============================================================
   Config / reference data (mirrors the frontend's dropdown lists
   so the seeded data looks like real HKD ERP data)
   ============================================================ */

const BUYERS = [
  "Decathlon - Knit", "Decathlon - Woven", "Walmart", "Columbia",
  "ZXY", "CTC", "DIESEL", "Sports Group Denmark", "Identity", "Fifth Avenur",
];
const WAREHOUSES = ["K-1", "K-2", "K-3"];
const RACKS = Array.from({ length: 10 }, (_, i) => `Rack-${i + 1}`);
const FROM_TYPES = ["Overseas", "Local"];
const SEASONS = ["SS24", "FW24", "SS25", "FW25", "SS26", "FW26"];
const COLORS = [
  "BLACK", "WHITE", "NAVY", "RED", "GREY", "BEIGE", "OLIVE",
  "BLUE", "GREEN", "MAROON", "KHAKI", "CREAM", "CHARCOAL", "SKY",
];
const ITEM_DESCRIPTIONS = [
  "100% COTTON TWILL", "POLY COTTON BLEND", "STRETCH DENIM",
  "RIB KNIT FABRIC", "FRENCH TERRY", "PIQUE KNIT", "NYLON RIPSTOP",
  "BRUSHED FLEECE", "SATIN WOVEN", "JERSEY SINGLE KNIT",
];
const REMARKS = [
  "SHORT SHIPMENT, FOLLOW UP WITH SUPPLIER", "QUALITY OK ON INSPECTION",
  "URGENT - NEEDED FOR CUTTING THIS WEEK", "PARTIAL INVOICE, BALANCE PENDING",
  "REPLACEMENT FOR REJECTED LOT", "PRIORITY BUYER ORDER",
];

/* ============================================================
   Small random helpers
   ============================================================ */

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const round2 = (n) => Math.round(n * 100) / 100;

function pickUniqueRacks(n) {
  const shuffled = [...RACKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDate(daysBack = 730) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// pending 35% / partial 35% / approved 30%
function weightedItemStatus() {
  const r = Math.random();
  if (r < 0.35) return "pending";
  if (r < 0.7) return "partial";
  return "approved";
}

/**
 * Given a batch's total rollQty/yds and a target status, works out how the
 * batch should be split across 0-3 racks so unassignedRoll/Yds and status
 * stay internally consistent -- exactly what assignLocation() would leave
 * behind in the real app.
 */
function buildAllocations(rollQty, ydsTotal, status) {
  if (status === "pending") {
    return { locations: [], unassignedRoll: rollQty, unassignedYds: round2(ydsTotal) };
  }

  const isApproved = status === "approved";
  const rackCount = isApproved ? randInt(1, 3) : randInt(1, 2);
  const racks = pickUniqueRacks(rackCount);

  // Fraction of the batch that ends up racked. Approved = 100%.
  const allocFraction = isApproved ? 1 : randFloat(0.2, 0.85);
  const allocRoll = isApproved ? rollQty : Math.max(1, Math.round(rollQty * allocFraction));
  const allocYds = isApproved ? round2(ydsTotal) : round2(ydsTotal * allocFraction);

  // Split the allocated portion across the chosen racks (both Roll and Yds
  // must be > 0 per rack, matching the app's validation), last rack takes
  // whatever remainder is left so totals always add up exactly.
  const locations = [];
  let remainingRoll = allocRoll;
  let remainingYds = allocYds;

  racks.forEach((rack, idx) => {
    const isLast = idx === racks.length - 1;
    let roll, yds;
    if (isLast) {
      roll = remainingRoll;
      yds = round2(remainingYds);
    } else {
      const share = randFloat(0.3, 0.7);
      roll = Math.max(1, Math.min(remainingRoll - (racks.length - idx - 1), Math.round(remainingRoll * share)));
      yds = round2(Math.min(remainingYds, remainingYds * share));
      remainingRoll -= roll;
      remainingYds = round2(remainingYds - yds);
    }
    locations.push({ location: rack, rollQty: roll, yds });
  });

  const unassignedRoll = rollQty - allocRoll;
  const unassignedYds = round2(ydsTotal - allocYds);

  return { locations, unassignedRoll, unassignedYds };
}

/* ============================================================
   Main seed routine
   ============================================================ */

async function seed() {
  const RECEIVE_COUNT = Number(process.argv[2]) || 120;
  const RESET = process.argv.includes("--reset") || process.env.SEED_RESET === "true";

  console.log(`🌱 Seeding ${RECEIVE_COUNT} Material Receives...`);

  if (RESET) {
    console.log("♻️  Deleting existing material_receives (cascades to styles/items/locations/history)...");
    await db.delete(materialReceives);
  }

  let totalStyles = 0;
  let totalItems = 0;
  let totalLocations = 0;
  let totalHistory = 0;

  for (let i = 1; i <= RECEIVE_COUNT; i++) {
    const date = randomDate();
    const invoiceNo = `INV-${date.replace(/-/g, "")}-${String(i).padStart(5, "0")}`;
    const fromType = pick(FROM_TYPES);
    const warehouse = pick(WAREHOUSES);
    const buyer = pick(BUYERS);
    const season = pick(SEASONS);
    const po = `PO-${randInt(100000, 999999)}`;
    const item = pick(ITEM_DESCRIPTIONS);
    const buy = pick(BUYERS);
    const remark = Math.random() < 0.3 ? pick(REMARKS) : null;

    // 1) Parent receive row -- created "pending", corrected to "approved"
    //    at the very end of this loop iteration if every item ends up approved.
    const [receiveResult] = await db.insert(materialReceives).values({
      date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy, remark, status: "pending",
    });
    const materialReceiveId = receiveResult.insertId;

    // 2) Style/Model rows
    const styleCount = randInt(1, 2);
    const stylesArray = Array.from({ length: styleCount }, () => ({
      materialReceiveId,
      style: `STY-${randInt(1000, 9999)}`,
      model: `MDL-${randInt(100, 999)}`,
    }));
    await db.insert(materialReceiveStyles).values(stylesArray);
    totalStyles += stylesArray.length;

    // 3) Item Code/PDM + Color batches, each with its own rack allocations
    const itemCount = randInt(1, 3);
    const itemStatuses = [];

    for (let k = 0; k < itemCount; k++) {
      const rollQty = randInt(10, 250);
      const ydsPerRoll = randFloat(8, 15);
      const ydsTotal = round2(rollQty * ydsPerRoll);
      const itemCodePdm = `PDM-${randInt(1000, 9999)}`;
      const color = pick(COLORS);

      const targetStatus = weightedItemStatus();
      const { locations, unassignedRoll, unassignedYds } = buildAllocations(rollQty, ydsTotal, targetStatus);

      const [itemResult] = await db.insert(materialReceiveItems).values({
        materialReceiveId,
        itemCodePdm,
        color,
        rollQty,
        yds: ydsTotal,
        unassignedRoll,
        unassignedYds,
        status: targetStatus,
        approvedAt: targetStatus === "approved" ? new Date() : null,
      });
      const itemId = itemResult.insertId;
      totalItems++;
      itemStatuses.push(targetStatus);

      // "receive" history row -- batch entering the system, no rack yet
      const historyRows = [
        {
          batchId: itemId,
          allocationId: null,
          materialReceiveId,
          action: "receive",
          location: null,
          rollQty,
          yds: ydsTotal,
          note: `Received via invoice ${invoiceNo}`,
        },
      ];

      // 4) Rack allocations for this batch (0-3 rows depending on status)
      for (const loc of locations) {
        const [locResult] = await db.insert(materialReceiveItemLocations).values({
          itemId,
          materialReceiveId,
          location: loc.location,
          rollQty: loc.rollQty,
          yds: loc.yds,
          availableRoll: loc.rollQty,
          availableYds: loc.yds,
        });
        totalLocations++;

        historyRows.push({
          batchId: itemId,
          allocationId: locResult.insertId,
          materialReceiveId,
          action: "location_assignment",
          location: loc.location,
          rollQty: loc.rollQty,
          yds: loc.yds,
          note: `Assigned ${loc.rollQty} Roll / ${loc.yds} Yds to ${loc.location}`,
        });
      }

      await db.insert(stockHistory).values(historyRows);
      totalHistory += historyRows.length;
    }

    // 5) Cascade the parent Receive's status -- "approved" only if every
    //    one of its item batches ended up "approved", same rule as
    //    recomputeItemStatus() in locationAssignment.controllers.js
    if (itemStatuses.every((s) => s === "approved")) {
      await db.update(materialReceives).set({ status: "approved" }).where(eq(materialReceives.id, materialReceiveId));
    }

    if (i % 20 === 0 || i === RECEIVE_COUNT) {
      console.log(`  ...${i}/${RECEIVE_COUNT} receives done`);
    }
  }

  console.log("✅ Seed complete:");
  console.log({
    receives: RECEIVE_COUNT,
    styles: totalStyles,
    items: totalItems,
    locations: totalLocations,
    stockHistory: totalHistory,
    grandTotalRows: RECEIVE_COUNT + totalStyles + totalItems + totalLocations + totalHistory,
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});