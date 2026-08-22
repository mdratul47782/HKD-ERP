/**
 * seed-rack-inventory.js
 * -----------------------------------------------------------------------
 * Imports the "SS25,AW25,SS26,AW26" sheet from
 *   1_RACK_WISE_INVENTORY-Main.xlsx
 * into the MySQL schema defined in src/db/schema.mysql.js (run this script
 * from inside the backend/ folder, alongside package.json)
 * (materialReceives -> materialReceiveStyles -> materialReceiveItems
 *  -> materialReceiveItemLocations, + stockHistory audit rows).
 *
 * USAGE
 *   npm install xlsx mysql2 drizzle-orm dotenv
 *   node seed-rack-inventory.js /path/to/1_RACK_WISE_INVENTORY-Main.xlsx
 *
 * ENV VARS (or edit DB_CONFIG below)
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *
 * -----------------------------------------------------------------------
 * DECISIONS BAKED INTO THIS SCRIPT (confirmed with user before writing):
 *
 * 1. Only sheet "SS25,AW25,SS26,AW26" is imported. All other tabs
 *    (PADDING, DESTROY, MAIL, k3, fail2, etc.) are skipped -- inconsistent
 *    / incomplete column layouts, not part of this import.
 *
 * 2. Historical "ISSUE YDS / ISSUE ROLL" columns are IGNORED. We do not
 *    reconstruct old Cutting Issue history. Instead, the sheet's
 *    "INHAND QTY / INHAND ROLL" values are loaded directly as
 *    availableRoll/availableYds on each rack allocation -- i.e. this
 *    import establishes each rack's CURRENT balance as the opening
 *    balance in the new system. No `stock_history` "issue" rows and no
 *    `cutting_issues` rows are created for old issues.
 *
 * 3. PARENT GROUPING (materialReceives):
 *    The schema comment says "one parent = one Date/Invoice", but real
 *    data has many Invoices spanning multiple PO numbers and even
 *    multiple Seasons (po/season are NOT NULL, single-value fields on
 *    the parent). To avoid fabricating or dropping data, this script
 *    groups into one materialReceives parent per UNIQUE
 *    (DATE, INVOICE, PO, SEASON) combination instead of just
 *    (DATE, INVOICE). Where INVOICE covers several POs, you'll get
 *    several parent rows sharing the same invoice number -- that is
 *    expected and intentional.
 *
 * 4. STYLE grouping (materialReceiveStyles): grouped by (STYLE, MODEL)
 *    within each parent.
 *
 * 5. BATCH grouping (materialReceiveItems): grouped by (ITEM_CODE, COLOR)
 *    within each parent. rollQty/yds = SUM of RCVD ROLL/QTY across all
 *    sheet rows in that group (this is what lets a batch legitimately
 *    span multiple racks, matching the schema's design).
 *
 * 6. LOCATION rows (materialReceiveItemLocations): one row per original
 *    Excel row within a batch group.
 *      rollQty/yds        = that row's RCVD ROLL / RCVD QTY (as received
 *                            onto that specific rack)
 *      availableRoll/Yds  = that row's INHAND ROLL / INHAND QTY, clamped
 *                            to >= 0 (see SKIPPED/CLAMPED report below)
 *
 * 7. INSPECTION FIELDS: since there is no separate inspection step in
 *    the historical data, every batch is treated as 100% passed:
 *      passedRoll/passedYds   = rollQty/yds (full received amount)
 *      rejectedRoll/rejectedYds = 0
 *      inspectedAt             = the batch's (first) DATE
 *    unassignedRoll/Yds = passed - sum(location rollQty/yds) -> this will
 *    be 0 for every batch here because every received row already has a
 *    rack in the sheet. status is therefore "approved" for all imported
 *    batches (fully racked), with approvedAt = inspectedAt.
 *
 * 8. FIELDS WITH NO SOURCE COLUMN (review/edit before running!):
 *      fromType: derived from ORIGIN -> 'BD' => 'Local', else 'Import'
 *      warehouse: left at schema default "K-2" for every row
 *      buy: no matching column in the sheet -> set to '' (empty string).
 *           Edit DEFAULT_BUY below if you have a real value to use.
 *      item (parent-level): first non-null "ITEM" value seen in the
 *           group (e.g. "reinforcement fabric") -- this is a summary
 *           label only, individual batches keep their own ITEM CODE.
 *
 * 9. ROWS SKIPPED ENTIRELY: any Excel row where RCVD QTY is blank
 *    (262 rows in the source file) is skipped and written to
 *    ./skipped-rows.json for manual review -- we will not guess a
 *    received quantity.
 *
 * Review section 8 in particular before running against production.
 * -----------------------------------------------------------------------
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

import {
  materialReceiveItemLocations,
  materialReceiveItems,
  materialReceives,
  materialReceiveStyles,
  stockHistory,
} from "./src/db/schema.mysql.js"; // seed-rack-inventory.js lives in backend/, schema is at backend/src/db/

// ------------------------------------------------------------------ CONFIG

const SHEET_NAME = "SS25,AW25,SS26,AW26";
const HEADER_ROW_INDEX = 1; // 0-based; real header is row 2 in Excel (row 1 is a stray totals row)
const DATA_START_ROW_INDEX = 2; // 0-based; data starts at Excel row 3

const DEFAULT_BUY = ""; // no source column -- edit if you have a real value
const DEFAULT_WAREHOUSE = "K-2";

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "HKD-ERP-DB",
};

// Diagnostic: if the .env file failed to load (common on Windows when it
// was saved with UTF-16 encoding instead of UTF-8), the values above will
// silently fall back to the defaults. Uncomment to check:
// console.log("DB_CONFIG resolved to:", DB_CONFIG);

// Column letter -> field name (0-based index in the row array)
// Matches header row 2 of the "SS25,AW25,SS26,AW26" sheet.
const COL = {
  BUYER: 0,
  DATE: 1,
  INVOICE: 2,
  SEASON: 3,
  PO: 4,
  STYLE: 5,
  MODEL: 6,
  FABRIC_DETAILS: 7,
  ITEM: 8,
  ITEM_CODE: 9,
  COLOR: 10,
  // column 11 (index 11) is a stray/unlabeled column in the source header
  // row (contains a leftover date value) -- intentionally ignored.
  RCVD_QTY: 12,
  RCVD_ROLL: 13,
  ISSUE_YDS: 14, // ignored per decision #2
  ISSUE_ROLL: 15, // ignored per decision #2
  INHAND_QTY: 16,
  INHAND_ROLL: 17,
  RACK: 18,
  REMARK: 19,
  SUPPLIER: 20,
  ORIGIN: 21,
};

// ------------------------------------------------------------------ HELPERS

function s(v) {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str.length ? str : null;
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateString(v) {
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  // xlsx with cellDates:true always gives JS Date for date cells; fallback:
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function money(n) {
  // decimal columns are stored as strings by drizzle-orm mysql2
  return (Math.round((n ?? 0) * 100) / 100).toFixed(2);
}

// ------------------------------------------------------------------ LOAD + PARSE

function loadRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found in ${filePath}`);

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const dataRows = raw.slice(DATA_START_ROW_INDEX);

  const parsed = [];
  const skipped = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const excelRowNum = DATA_START_ROW_INDEX + i + 1; // 1-based, for human-readable logs

    if (!row || row.every((v) => v === null || v === undefined || v === "")) continue;

    const rcvdQty = num(row[COL.RCVD_QTY]);
    const date = row[COL.DATE];

    if (rcvdQty === null || !date) {
      skipped.push({ excelRow: excelRowNum, reason: !date ? "missing date" : "missing RCVD QTY", row });
      continue;
    }

    let inhandQty = num(row[COL.INHAND_QTY]) ?? 0;
    let inhandRoll = num(row[COL.INHAND_ROLL]) ?? 0;
    let clamped = false;
    if (inhandQty < 0) { inhandQty = 0; clamped = true; }
    if (inhandRoll < 0) { inhandRoll = 0; clamped = true; }
    if (clamped) {
      skipped.push({ excelRow: excelRowNum, reason: "negative INHAND clamped to 0", row });
    }

    parsed.push({
      excelRow: excelRowNum,
      buyer: s(row[COL.BUYER]),
      date: toDateString(date),
      invoice: s(row[COL.INVOICE]),
      season: s(row[COL.SEASON]),
      po: s(row[COL.PO]),
      style: s(row[COL.STYLE]),
      model: s(row[COL.MODEL]),
      fabricDetails: s(row[COL.FABRIC_DETAILS]),
      item: s(row[COL.ITEM]),
      itemCodePdm: s(row[COL.ITEM_CODE]),
      color: s(row[COL.COLOR]),
      rcvdYds: rcvdQty,
      rcvdRoll: num(row[COL.RCVD_ROLL]) ?? 0,
      inhandYds: inhandQty,
      inhandRoll: inhandRoll,
      rack: s(row[COL.RACK]),
      supplier: s(row[COL.SUPPLIER]),
      origin: s(row[COL.ORIGIN]),
    });
  }

  return { parsed, skipped };
}

// ------------------------------------------------------------------ GROUP

function groupData(rows) {
  // Parent: (date, invoice, po, season) -- see decision #3
  const parents = new Map();

  for (const r of rows) {
    if (!r.buyer || !r.date || !r.invoice || !r.po || !r.season) {
      // required NOT NULL fields on materialReceives -- skip if any missing
      continue;
    }
    const parentKey = [r.date, r.invoice, r.po, r.season].join("||");
    if (!parents.has(parentKey)) {
      parents.set(parentKey, {
        date: r.date,
        invoiceNo: r.invoice,
        po: r.po,
        season: r.season,
        buyer: r.buyer,
        supplier: r.supplier,
        item: r.item,
        origin: r.origin,
        styles: new Map(), // key: style||model
        items: new Map(), // key: itemCodePdm||color
      });
    }
    const parent = parents.get(parentKey);
    if (!parent.supplier && r.supplier) parent.supplier = r.supplier;
    if (!parent.item && r.item) parent.item = r.item;

    // style child
    if (r.style) {
      const styleKey = `${r.style}||${r.model || ""}`;
      if (!parent.styles.has(styleKey)) {
        parent.styles.set(styleKey, { style: r.style, model: r.model });
      }
    }

    // item batch (itemCode + color)
    if (r.itemCodePdm && r.color) {
      const itemKey = `${r.itemCodePdm}||${r.color}`;
      if (!parent.items.has(itemKey)) {
        parent.items.set(itemKey, {
          itemCodePdm: r.itemCodePdm,
          color: r.color,
          fabricDetails: r.fabricDetails,
          date: r.date,
          rollQty: 0,
          yds: 0,
          locations: [],
        });
      }
      const batch = parent.items.get(itemKey);
      if (!batch.fabricDetails && r.fabricDetails) batch.fabricDetails = r.fabricDetails;
      batch.rollQty += r.rcvdRoll;
      batch.yds += r.rcvdYds;
      batch.locations.push({
        location: r.rack || "UNSPECIFIED",
        rollQty: r.rcvdRoll,
        yds: r.rcvdYds,
        availableRoll: r.inhandRoll,
        availableYds: r.inhandYds,
      });
    }
  }

  return parents;
}

// ------------------------------------------------------------------ INSERT

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node seed-rack-inventory.js /path/to/1_RACK_WISE_INVENTORY-Main.xlsx");
    process.exit(1);
  }

  const { parsed, skipped } = loadRows(path.resolve(filePath));
  console.log(`Parsed ${parsed.length} usable rows, skipped ${skipped.length} rows.`);
  fs.writeFileSync(
    path.resolve("./skipped-rows.json"),
    JSON.stringify(skipped, null, 2)
  );
  console.log("Skipped-row detail written to ./skipped-rows.json");

  const parents = groupData(parsed);
  console.log(`Grouped into ${parents.size} materialReceives parent rows.`);

  const connection = await mysql.createConnection(DB_CONFIG);
  const db = drizzle(connection);

  let parentCount = 0;
  let styleCount = 0;
  let itemCount = 0;
  let locationCount = 0;

  try {
    for (const parent of parents.values()) {
      const fromType = (parent.origin || "").toUpperCase().includes("BD") ? "Local" : "Import";

      const [receiveResult] = await db.insert(materialReceives).values({
        date: parent.date,
        invoiceNo: parent.invoiceNo,
        fromType,
        warehouse: DEFAULT_WAREHOUSE,
        buyer: parent.buyer,
        supplier: parent.supplier || null,
        season: parent.season,
        po: parent.po,
        item: parent.item || "N/A",
        buy: DEFAULT_BUY,
        remark: "Imported from 1_RACK_WISE_INVENTORY-Main.xlsx (SS25,AW25,SS26,AW26)",
        status: "approved",
      });
      const materialReceiveId = receiveResult.insertId;
      parentCount++;

      // NOTE: stockHistory.batchId is NOT NULL, so there is no parent-level
      // (invoice-wide) history marker -- only per-batch "receive" and
      // per-location "location_assignment" rows below, which is enough to
      // reconstruct the full opening balance per batch/rack.

      for (const style of parent.styles.values()) {
        await db.insert(materialReceiveStyles).values({
          materialReceiveId,
          style: style.style,
          model: style.model,
        });
        styleCount++;
      }

      for (const batch of parent.items.values()) {
        const passedRoll = batch.rollQty;
        const passedYds = money(batch.yds);

        const [itemResult] = await db.insert(materialReceiveItems).values({
          materialReceiveId,
          itemCodePdm: batch.itemCodePdm,
          color: batch.color,
          fabricDetails: batch.fabricDetails || null,
          rollQty: batch.rollQty,
          yds: money(batch.yds),
          passedRoll,
          passedYds,
          rejectedRoll: 0,
          rejectedYds: "0.00",
          inspectedAt: new Date(batch.date),
          inspectionNote: "Bulk import: assumed 100% passed (no historical inspection data)",
          unassignedRoll: 0,
          unassignedYds: "0.00",
          status: "approved",
          approvedAt: new Date(batch.date),
        });
        const itemId = itemResult.insertId;
        itemCount++;

        await db.insert(stockHistory).values({
          batchId: itemId,
          allocationId: null,
          materialReceiveId,
          action: "receive",
          location: null,
          rollQty: batch.rollQty,
          yds: money(batch.yds),
          note: "Bulk import opening balance (received)",
        });

        for (const loc of batch.locations) {
          const [locResult] = await db.insert(materialReceiveItemLocations).values({
            itemId,
            materialReceiveId,
            location: loc.location,
            rollQty: loc.rollQty,
            yds: money(loc.yds),
            availableRoll: loc.availableRoll,
            availableYds: money(loc.availableYds),
          });
          locationCount++;

          await db.insert(stockHistory).values({
            batchId: itemId,
            allocationId: locResult.insertId,
            materialReceiveId,
            action: "location_assignment",
            location: loc.location,
            rollQty: loc.rollQty,
            yds: money(loc.yds),
            note: "Bulk import opening balance (racked)",
          });
        }
      }
    }

    console.log("Done.");
    console.log({ parentCount, styleCount, itemCount, locationCount });
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});